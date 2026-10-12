"""Readiness probe for the optional gateway without logging its capability."""
import os
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from .secrets import secret_value

if __name__ == '__main__':
    origin = os.environ['DEMO_SHARE_ORIGIN']
    token = secret_value('DEMO_SHARE_TOKEN')
    request = Request('http://127.0.0.1:8001/share/' + token + '/api/settings',
                      headers={'Host': urlsplit(origin).netloc})
    with urlopen(request, timeout=3) as response:
        assert response.status == 200
