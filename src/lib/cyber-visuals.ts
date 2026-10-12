import type { CyberScenario } from './cyber-fixture';

type CyberVisual = {
  files: { path: string; depth: number; focus: boolean }[];
  flow: { label: string; detail: string }[];
  code: {
    title: string;
    explanation: string;
    node: 0 | 1 | 2;
    path: string;
    url: string;
    lines: { number: number; text: string; highlight: boolean }[];
  }[];
  captions: {
    map: string;
    threat: string;
    discovery: string;
  };
};

// Source excerpts preserve the exact lines at the evaluated repository commits.
// Connected panels analyze public source; they do not claim additional observed tool calls.
// Captions describe source structure, trust boundaries, and data flow.
export const CYBER_VISUALS: Record<CyberScenario['id'], CyberVisual> = {
  openfire: {
    files: [
      { path: 'pom.xml', depth: 0, focus: false },
      { path: 'xmppserver/', depth: 0, focus: false },
      {
        path: 'xmppserver/src/main/java/org/jivesoftware/util/',
        depth: 1,
        focus: false,
      },
      {
        path: 'xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java',
        depth: 2,
        focus: true,
      },
      {
        path: 'xmppserver/src/main/java/org/jivesoftware/util/XMLProperties.java',
        depth: 2,
        focus: false,
      },
    ],
    flow: [
      { label: 'Host parameter', detail: 'request.getParameter reads the input' },
      { label: 'URL construction', detail: 'getImage concatenates host into a URL' },
      { label: 'HTTP client', detail: 'client.execute sends the request' },
    ],
    code: [
      {
        title: '1. Input: host parameter',
        explanation: 'doGet reads the host parameter. The gmail.com rewrite does not restrict other destinations.',
        path: 'xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java',
        url: 'https://github.com/igniterealtime/Openfire/blob/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24/xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java#L118-L124',
        node: 0,
        lines: [
          { number: 118, text: '    public void doGet(HttpServletRequest request, HttpServletResponse response) {', highlight: false },
          { number: 119, text: '        String host = request.getParameter("host");', highlight: true },
          { number: 120, text: '        // Check special cases where we need to change host to get a favicon', highlight: false },
          { number: 121, text: '        host = "gmail.com".equals(host) ? "google.com" : host;', highlight: false },
          { number: 122, text: '', highlight: false },
          { number: 123, text: '        byte[] bytes = getImage(host, defaultBytes);', highlight: true },
          { number: 124, text: '        if (bytes != null) {', highlight: false },
        ],
      },
      {
        title: '2. Propagation: URL construction',
        explanation: 'On this uncached path, getImage concatenates the supplied host between http:// and /favicon.ico.',
        path: 'xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java',
        url: 'https://github.com/igniterealtime/Openfire/blob/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24/xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java#L160-L166',
        node: 1,
        lines: [
          { number: 160, text: '        // See if we\'ve cached the favicon.', highlight: false },
          { number: 161, text: '        if (hitsCache.containsKey(host)) {', highlight: false },
          { number: 162, text: '            return hitsCache.get(host);', highlight: false },
          { number: 163, text: '        }', highlight: false },
          { number: 164, text: '        byte[] bytes = getImage("http://" + host + "/favicon.ico");', highlight: true },
          { number: 165, text: '        if (bytes == null) {', highlight: false },
          { number: 166, text: '            // Cache that the requested domain does not have a favicon. Check if this', highlight: false },
        ],
      },
      {
        title: '3. Sink: HTTP client',
        explanation: 'client.execute sends the request. HTTP 200 response bodies are returned as bytes without image validation.',
        path: 'xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java',
        url: 'https://github.com/igniterealtime/Openfire/blob/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24/xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java#L191-L198',
        node: 2,
        lines: [
          { number: 191, text: '        final HttpUriRequest getRequest = RequestBuilder.get(url)', highlight: true },
          { number: 192, text: '            .setConfig(requestConfig)', highlight: false },
          { number: 193, text: '            .build();', highlight: false },
          { number: 194, text: '', highlight: false },
          { number: 195, text: '        try(final CloseableHttpResponse response = client.execute(getRequest)) {', highlight: true },
          { number: 196, text: '            if(response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {', highlight: false },
          { number: 197, text: '                return EntityUtils.toByteArray(response.getEntity());', highlight: true },
          { number: 198, text: '            }', highlight: false },
        ],
      },
    ],
    captions: {
      map: 'FaviconServlet.java handles icon retrieval; XMLProperties.java loads XML configuration.',
      threat: 'An untrusted host parameter controls the destination of a server-side HTTP request.',
      discovery: 'The host parameter reaches URL construction and client.execute without destination restrictions on this path.',
    },
  },
  'set-value': {
    files: [
      { path: 'package.json', depth: 0, focus: false },
      { path: 'index.js', depth: 0, focus: true },
      { path: 'test.js', depth: 0, focus: false },
      { path: 'README.md', depth: 0, focus: false },
    ],
    flow: [
      { label: 'Property path', detail: 'The caller supplies keys and a value' },
      { label: 'Property traversal', detail: 'target[prop] follows each key' },
      { label: 'Property assignment', detail: 'result writes to the reached object' },
    ],
    code: [
      {
        title: '1. Input: property path',
        explanation: 'String paths are split into keys; array paths supply keys directly. The caller also controls the assigned value.',
        path: 'index.js',
        url: 'https://github.com/jonschlinkert/set-value/blob/7bd5011d82e583305a191a9a062abfe177ec29ad/index.js#L28-L35',
        node: 0,
        lines: [
          { number: 28, text: '  const keys = isArray ? path : split(path, opts);', highlight: true },
          { number: 29, text: '  const len = keys.length;', highlight: false },
          { number: 30, text: '  const orig = target;', highlight: false },
          { number: 31, text: '', highlight: false },
          { number: 32, text: '  if (!options && keys.length === 1) {', highlight: false },
          { number: 33, text: '    result(target, keys[0], value, merge);', highlight: true },
          { number: 34, text: '    return target;', highlight: false },
          { number: 35, text: '  }', highlight: false },
        ],
      },
      {
        title: '2. Propagation: property traversal',
        explanation: 'target[prop] follows inherited properties as well as own properties, allowing traversal into a shared prototype.',
        path: 'index.js',
        url: 'https://github.com/jonschlinkert/set-value/blob/7bd5011d82e583305a191a9a062abfe177ec29ad/index.js#L44-L50',
        node: 1,
        lines: [
          { number: 44, text: '    if (i === len - 1) {', highlight: false },
          { number: 45, text: '      result(target, prop, value, merge);', highlight: true },
          { number: 46, text: '      break;', highlight: false },
          { number: 47, text: '    }', highlight: false },
          { number: 48, text: '', highlight: false },
          { number: 49, text: '    target = target[prop];', highlight: true },
          { number: 50, text: '  }', highlight: false },
        ],
      },
      {
        title: '3. Sink: property assignment',
        explanation: 'result assigns or merges the value into the reached object. Prototype keys are not filtered on this path.',
        path: 'index.js',
        url: 'https://github.com/jonschlinkert/set-value/blob/7bd5011d82e583305a191a9a062abfe177ec29ad/index.js#L55-L61',
        node: 2,
        lines: [
          { number: 55, text: 'function result(target, path, value, merge) {', highlight: false },
          { number: 56, text: '  if (merge && isPlain(target[path]) && isPlain(value)) {', highlight: false },
          { number: 57, text: '    target[path] = merge({}, target[path], value);', highlight: true },
          { number: 58, text: '  } else {', highlight: false },
          { number: 59, text: '    target[path] = value;', highlight: true },
          { number: 60, text: '  }', highlight: false },
          { number: 61, text: '}', highlight: false },
        ],
      },
    ],
    captions: {
      map: 'index.js implements nested property assignment; test.js covers setter behavior.',
      threat: 'Caller-controlled keys can traverse inherited properties and write to a shared prototype.',
      discovery: 'Path splitting feeds property traversal, then assignment. No prototype-key filter separates input from the write.',
    },
  },
  cosmos: {
    files: [
      { path: 'openc3/', depth: 0, focus: false },
      { path: 'openc3/lib/openc3/core_ext/', depth: 1, focus: false },
      { path: 'openc3/lib/openc3/core_ext/string.rb', depth: 2, focus: true },
      { path: 'openc3/lib/openc3/conversions/', depth: 1, focus: false },
      {
        path: 'openc3/lib/openc3/conversions/object_read_conversion.rb',
        depth: 2,
        focus: false,
      },
    ],
    flow: [
      { label: 'Parameter text', detail: 'The parser calls convert_to_value' },
      { label: 'Format validation', detail: 'is_array? checks surrounding brackets' },
      { label: 'Ruby eval', detail: 'eval(self) evaluates the original text' },
    ],
    code: [
      {
        title: '1. Input: command parameter text',
        explanation: 'The command parser passes parameter text to convert_to_value after its quoted-string and hex-string handling.',
        path: 'openc3/lib/openc3/script/extract.rb',
        url: 'https://github.com/OpenC3/cosmos/blob/24ca2102180a28d9bb83a7251497865b50e0cc55/openc3/lib/openc3/script/extract.rb#L59-L66',
        node: 0,
        lines: [
          { number: 59, text: '        if (type == \'STRING\' or type == \'BLOCK\') and value.upcase.start_with?("0X")', highlight: false },
          { number: 60, text: '          cmd_params[keyword] = value.hex_to_byte_string', highlight: false },
          { number: 61, text: '        else', highlight: false },
          { number: 62, text: '          cmd_params[keyword] = value.convert_to_value', highlight: true },
          { number: 63, text: '        end', highlight: false },
          { number: 64, text: '      else', highlight: false },
          { number: 65, text: '        cmd_params[keyword] = quotes_removed', highlight: false },
          { number: 66, text: '      end', highlight: false },
        ],
      },
      {
        title: '2. Propagation: bracket check',
        explanation: 'is_array? matches surrounding brackets. The regex does not restrict their contents to literal data.',
        path: 'openc3/lib/openc3/core_ext/string.rb',
        url: 'https://github.com/OpenC3/cosmos/blob/24ca2102180a28d9bb83a7251497865b50e0cc55/openc3/lib/openc3/core_ext/string.rb#L41-L210',
        node: 1,
        lines: [
          { number: 41, text: '  # Regular expression to identify a String as an Array of numbers', highlight: false },
          { number: 42, text: '  ARRAY_CHECK_REGEX = /\\A\\s*\\[.*\\]\\s*\\z/', highlight: true },
          { number: 43, text: '', highlight: false },
          { number: 207, text: '  # @return [Boolean] Whether the String represents an Array', highlight: false },
          { number: 208, text: '  def is_array?', highlight: false },
          { number: 209, text: '    if ARRAY_CHECK_REGEX.match?(self) then true else false end', highlight: true },
          { number: 210, text: '  end', highlight: false },
        ],
      },
      {
        title: '3. Sink: Ruby eval',
        explanation: 'The array branch passes the original string to eval(self), allowing embedded Ruby expressions to execute.',
        path: 'openc3/lib/openc3/core_ext/string.rb',
        url: 'https://github.com/OpenC3/cosmos/blob/24ca2102180a28d9bb83a7251497865b50e0cc55/openc3/lib/openc3/core_ext/string.rb#L239-L246',
        node: 2,
        lines: [
          { number: 239, text: '        # Hex', highlight: false },
          { number: 240, text: '        return_value = Integer(self)', highlight: false },
          { number: 241, text: '      elsif self.is_array?', highlight: true },
          { number: 242, text: '        # Array', highlight: false },
          { number: 243, text: '        return_value = eval(self)', highlight: true },
          { number: 244, text: '      end', highlight: false },
          { number: 245, text: '    rescue Exception', highlight: false },
          { number: 246, text: '      # Something went wrong so just return the string as is', highlight: false },
        ],
      },
    ],
    captions: {
      map: 'string.rb defines format checks and convert_to_value. Command parsing supplies input through extract.rb.',
      threat: 'A bracket-only format check allows Ruby expressions to reach an eval sink.',
      discovery: 'Parameter text passes through convert_to_value and is_array? before reaching eval(self) unchanged.',
    },
  },
};
