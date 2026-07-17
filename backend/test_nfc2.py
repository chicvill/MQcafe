import sys
import traceback
sys.path.append('.')
from fastapi import BackgroundTasks
from schemas import NfcScanRequest
from routers.nfc_access import scan_nfc_card

if __name__ == "__main__":
    try:
        bg = BackgroundTasks()
        res = scan_nfc_card(NfcScanRequest(uid="TEST-UID-9999"), bg)
        print("Success:", res)
    except Exception:
        traceback.print_exc()
