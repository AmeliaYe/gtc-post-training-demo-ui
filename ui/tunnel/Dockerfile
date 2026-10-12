FROM alpine:3.20
RUN apk add --no-cache openssh-client sshpass \
 && adduser -D -h /home/tunnel tunnel \
 && mkdir -p /home/tunnel/.ssh && chown -R tunnel /home/tunnel
COPY entrypoint.sh /entrypoint.sh
USER tunnel
ENTRYPOINT ["/entrypoint.sh"]
