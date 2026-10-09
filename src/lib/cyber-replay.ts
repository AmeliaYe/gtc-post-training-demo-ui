export type RecordedToolCall = {
  id: string;
  ordinal: number;
  tool: 'shell_tool';
  rationale: string;
  command: string;
  output: string;
  source: string;
  exitCode: number;
};

// Selected calls from the recorded final-checkpoint Openfire run, in actual order.
// Commands are literal. Output contains literal stdout excerpts; every omission is
// marked. Source links locate the same evaluated revision, not a new tool call.
// Grouping one Favicon read into input / URL / HTTP details is editorial.
// Rationales are literal excerpts immediately before their respective calls.
// Decoded from the native RolloutResult using its recorded Nemotron tokenizer.
// Trace identity and verdict also match the sanitized dfbench export at
// demos/rl-nvidia/traces/openfire-final.json, ref rl-nvidia-presentation.
export const OPENFIRE_REPLAY_PROVENANCE = {
  traceId: '7c81b594c24ce3b43ce33577bf7adc67',
  policyStep: 200,
  totalToolCalls: 26,
  shellToolCalls: 24,
  memoryToolCalls: 2,
  generations: 28,
  note: 'Selected recorded calls; source details are editorial zooms. The checker matched the report to a known flaw; no live exploit was run in this trace.',
} as const;

// Excerpts from generations[0].prompt in the same rollout, without Markdown markers.
// The audit scope lists six files; the task does not disclose SSRF or the CVE.
export const OPENFIRE_REVIEW_PROMPT = {
  goal: 'Find all real, exploitable security issues in the files listed in <audit_scope>.',
  method: 'Track data flow end-to-end',
  scope: '6 Java files in Openfire',
} as const;

// Literal excerpt after call 3 returned, from generation 4 before call 4.
// This assessment is not a rationale recorded before reading the file.
export const OPENFIRE_SOURCE_ASSESSMENT = {
  text: 'This is a potential SSRF vulnerability. The server makes outgoing HTTP requests based on user-controlled input.',
  afterCallId: 'favicon',
} as const;

export const OPENFIRE_TOOL_CALLS: RecordedToolCall[] = [
  {
    "id": "scope",
    "ordinal": 1,
    "tool": "shell_tool",
    "rationale": "Let me start by understanding the audit scope and then systematically examine each file.",
    "command": "find /app/igniterealtime/Openfire -type f -name \"*.java\" | grep -E \"(AesEncryptor|FaviconServlet|S2STestService|WebManager|WebXmlUtils|XMLProperties)\" | head -20",
    "output": "/app/igniterealtime/Openfire/xmppserver/src/test/java/org/jivesoftware/util/XMLPropertiesTest.java\n/app/igniterealtime/Openfire/xmppserver/src/test/java/org/jivesoftware/util/WebXmlUtilsTest.java\n/app/igniterealtime/Openfire/xmppserver/src/test/java/org/jivesoftware/util/AesEncryptorTest.java\n/app/igniterealtime/Openfire/xmppserver/src/main/java/org/jivesoftware/util/XMLProperties.java\n/app/igniterealtime/Openfire/xmppserver/src/main/java/org/jivesoftware/util/WebXmlUtils.java\n/app/igniterealtime/Openfire/xmppserver/src/main/java/org/jivesoftware/util/WebManager.java\n/app/igniterealtime/Openfire/xmppserver/src/main/java/org/jivesoftware/util/S2STestService.java\n/app/igniterealtime/Openfire/xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java\n/app/igniterealtime/Openfire/xmppserver/src/main/java/org/jivesoftware/util/AesEncryptor.java",
    "source": "https://github.com/igniterealtime/Openfire/tree/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24/xmppserver/src/main/java/org/jivesoftware/util/",
    "exitCode": 0
  },
  {
    "id": "favicon",
    "ordinal": 3,
    "tool": "shell_tool",
    "rationale": "Let me note this but focus on more exploitable issues. Let me move to the next file.",
    "command": "cat /app/igniterealtime/Openfire/xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java",
    "output": "… [output omitted]\n    public void doGet(HttpServletRequest request, HttpServletResponse response) {\n        String host = request.getParameter(\"host\");\n        // Check special cases where we need to change host to get a favicon\n        host = \"gmail.com\".equals(host) ? \"google.com\" : host;\n\n        byte[] bytes = getImage(host, defaultBytes);\n        if (bytes != null) {\n… [output omitted]\n        byte[] bytes = getImage(\"http://\" + host + \"/favicon.ico\");\n… [output omitted]\n        final HttpUriRequest getRequest = RequestBuilder.get(url)\n            .setConfig(requestConfig)\n            .build();\n\n        try(final CloseableHttpResponse response = client.execute(getRequest)) {\n            if(response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {\n                return EntityUtils.toByteArray(response.getEntity());\n            }\n… [output omitted]",
    "source": "https://github.com/igniterealtime/Openfire/blob/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24/xmppserver/src/main/java/org/jivesoftware/util/FaviconServlet.java#L118-L198",
    "exitCode": 0
  },
  {
    "id": "registration",
    "ordinal": 23,
    "tool": "shell_tool",
    "rationale": "Let me check the web.xml or plugin configuration to see how FaviconServlet is mapped.",
    "command": "cd /app/igniterealtime/Openfire && grep -rn \"FaviconServlet\" --include=\"*.xml\" . 2>/dev/null | head -10",
    "output": "… [output omitted]\n./xmppserver/src/main/webapp/WEB-INF/web.xml:115:        <servlet-name>FaviconServlet</servlet-name>\n./xmppserver/src/main/webapp/WEB-INF/web.xml:116:        <servlet-class>org.jivesoftware.util.FaviconServlet</servlet-class>\n./xmppserver/src/main/webapp/WEB-INF/web.xml:148:        <servlet-name>FaviconServlet</servlet-name>",
    "source": "https://github.com/igniterealtime/Openfire/blob/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24/xmppserver/src/main/webapp/WEB-INF/web.xml#L114-L118",
    "exitCode": 0
  },
  {
    "id": "endpoint",
    "ordinal": 24,
    "tool": "shell_tool",
    "rationale": "Let me check the servlet mapping for FaviconServlet in the web.xml to understand the URL pattern.",
    "command": "cd /app/igniterealtime/Openfire && sed -n '110,160p' xmppserver/src/main/webapp/WEB-INF/web.xml",
    "output": "… [output omitted]\n    <servlet-mapping>\n        <servlet-name>FaviconServlet</servlet-name>\n        <url-pattern>/getFavicon</url-pattern>\n    </servlet-mapping>\n… [output omitted]",
    "source": "https://github.com/igniterealtime/Openfire/blob/83f653f8d0601ff3667e1c5cf3ac18834f0d4a24/xmppserver/src/main/webapp/WEB-INF/web.xml#L147-L150",
    "exitCode": 0
  }
];
