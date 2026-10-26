"""Guard for one-off maintenance scripts that change data."""
import sys


def require_confirmation(what):
    """Exit unless the script was run with --yes. `what` says what the script will change."""
    if '--yes' in sys.argv[1:]:
        return
    print(f"This script {what}.")
    print("It is a one-off maintenance script, not part of the app. Re-run with --yes to go ahead.")
    sys.exit(1)
