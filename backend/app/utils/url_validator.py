import ipaddress
from urllib.parse import urlparse

from fastapi import HTTPException, status


PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def validate_target_url(url: str) -> str:
    """Validate a target URL: must be http/https and must not point to a private IP."""
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must use http or https scheme",
        )

    if not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must have a valid hostname",
        )

    hostname = parsed.hostname

    # Check if hostname is an IP address
    try:
        ip = ipaddress.ip_address(hostname)
        for network in PRIVATE_NETWORKS:
            if ip in network:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Target URL must not point to a private or loopback address",
                )
    except ValueError:
        # Not an IP address, it's a hostname
        # Block common private hostnames
        blocked_hosts = {"localhost", "localhost.localdomain", "0.0.0.0"}
        if hostname.lower() in blocked_hosts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target URL must not point to localhost or reserved addresses",
            )

    return url
