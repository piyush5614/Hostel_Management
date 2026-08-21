#!/usr/bin/env python3
"""Compatibility shim for the Node.js PDF generator.

The report generation logic now lives in scripts/generate_analysis_aesthetic.js.
This wrapper keeps the old Python entrypoint working while delegating the work
to Node.
"""

from pathlib import Path
import subprocess
import sys


def main() -> int:
    script_path = Path(__file__).with_suffix('.js')
    result = subprocess.run(['node', str(script_path), *sys.argv[1:]], check=False)
    return result.returncode


if __name__ == '__main__':
    raise SystemExit(main())
