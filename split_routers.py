import os
import ast

def split_router():
    with open("backend/routers/study_cafe.py", "r", encoding="utf-8") as f:
        source = f.read()

    tree = ast.parse(source)
    
    # We will build 4 files: store.py, seat_locker.py, session.py, admin.py
    # Each file will have the common imports at the top.
    
    imports = []
    helpers = []
    
    endpoints = {
        "store.py": ["/stores", "/owner/signup", "/owner/login"],
        "seat_locker.py": ["/seats", "/lockers", "/lockers/assign", "/move-seat"],
        "session.py": ["/checkin", "/entry", "/session/restore", "/outing", "/checkout"],
        "admin.py": ["/admin/chat", "/admin/trigger-archive", "/admin/reset-session", "/ws/customer/{session_id}", "/ws/admin"]
    }
    
    file_contents = {k: [] for k in endpoints.keys()}
    
    for node in tree.body:
        # Get source segment
        segment = ast.get_source_segment(source, node)
        if not segment:
            continue
            
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            imports.append(segment)
            continue
            
        is_endpoint = False
        target_file = None
        
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # check decorators
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                    if dec.func.value.id == "router":
                        path_arg = dec.args[0].value if dec.args else ""
                        is_endpoint = True
                        for f_name, paths in endpoints.items():
                            for p in paths:
                                if path_arg.startswith(p):
                                    target_file = f_name
                                    break
                            if target_file:
                                break
                        break
        
        if is_endpoint:
            if target_file:
                file_contents[target_file].append(segment)
            else:
                print(f"Unknown endpoint mapping for segment: {segment.splitlines()[0]}")
        else:
            if isinstance(node, ast.Assign) and getattr(node.targets[0], 'id', '') == 'router':
                pass # skip 'router = APIRouter()'
            elif isinstance(node, ast.AsyncFunctionDef) and node.name == 'send_system_message_to_customer':
                pass # skip because we moved it to services/notification.py
            else:
                helpers.append(segment)
                
    common_header = "\n".join(imports) + "\n\nfrom fastapi import APIRouter\nfrom services.notification import send_system_message_to_customer\n\nrouter = APIRouter()\n\n" + "\n\n".join(helpers) + "\n\n"
    
    for f_name, contents in file_contents.items():
        with open(f"backend/routers/{f_name}", "w", encoding="utf-8") as f:
            f.write(common_header + "\n\n".join(contents))
            
if __name__ == "__main__":
    split_router()
