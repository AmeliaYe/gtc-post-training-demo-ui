"""Patient-channel deltas, independent of Hermes' private reasoning channel."""


class VisibleText:
    """Hold split tag prefixes and discard reasoning without buffering its body."""

    names = ("think", "thinking", "reasoning", "reasoning_scratchpad")
    tags = tuple(f"<{slash}{name}>" for name in names for slash in ("", "/"))

    def __init__(self):
        self.pending = ""
        self.hidden = []
        self.started = False
        self.invalid = False

    def feed(self, text):
        if self.invalid:
            return ""
        self.pending += text
        visible = []
        while self.pending:
            if self.pending.startswith("<"):
                lower = self.pending.lower()
                tag = next((t for t in self.tags if lower.startswith(t)), None)
                if tag:
                    self.pending = self.pending[len(tag):]
                    name = tag.strip("</>")
                    if tag.startswith("</"):
                        if not self.hidden or self.hidden.pop() != name:
                            self.invalid = True
                    else:
                        # As with patient_visible_reply, reasoning must precede the answer.
                        if self.started:
                            self.invalid = True
                        self.hidden.append(name)
                    if self.invalid:
                        self.pending = ""
                        return ""
                    continue
                if any(t.startswith(lower) for t in self.tags):
                    break
                part, self.pending = "<", self.pending[1:]
            else:
                boundary = self.pending.find("<")
                boundary = boundary if boundary >= 0 else len(self.pending)
                part, self.pending = self.pending[:boundary], self.pending[boundary:]
            if not self.hidden:
                if not self.started:
                    part = part.lstrip()
                if part:
                    self.started = True
                    visible.append(part)
        return "".join(visible)

    @property
    def complete(self):
        return not (self.invalid or self.hidden or self.pending)


class ReplyStream:
    """Reset provisional text at each request/tool boundary; require a real finish."""

    def __init__(self, emit):
        self.emit = emit
        self.invalid = False
        self.text = VisibleText()
        self.suppressed = False

    def begin(self):
        self.text = VisibleText()
        self.suppressed = False
        self.emit("reply_reset")

    def discard(self):
        self.suppressed = True
        self.emit("reply_reset")

    def delta(self, value):
        if value is None:
            self.discard()
        elif not self.suppressed:
            visible = self.text.feed(value)
            if self.text.invalid:
                self.invalid = True
                self.discard()
            elif visible:
                self.emit("reply_delta", text=visible)

    def observe(self, response):
        """Observe native chunks; Hermes still assembles messages and executes tools."""
        finished = False
        try:
            for chunk in response:
                for choice in chunk.choices[:1]:
                    if choice.delta.tool_calls and not self.suppressed:
                        self.discard()
                    if choice.finish_reason:
                        finished = True
                yield chunk
        finally:
            # Hermes otherwise defaults a missing finish_reason to 'stop'. A dropped
            # SSE stream must never turn a provisional answer into a completed one.
            if not finished or (not self.suppressed and not self.text.complete):
                self.invalid = True
            response.close()

    def attach(self, agent):
        original = agent._create_request_openai_client

        def request_client(*, reason):
            client = original(reason=reason)
            create = client.chat.completions.create

            def completion(*args, **kwargs):
                self.begin()
                response = create(*args, **kwargs)
                return self.observe(response) if kwargs.get("stream") else response

            client.chat.completions.create = completion
            return client

        agent._create_request_openai_client = request_client

    @staticmethod
    def visible_reply(value):
        text = VisibleText()
        reply = text.feed(value).strip()
        if not text.complete:
            raise ValueError("Ambiguous patient-channel boundary")
        return reply
