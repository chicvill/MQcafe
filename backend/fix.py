import os

file_path = r"c:\Users\USER\Desktop\Workstation\MQcafe\backend\routers\admin.py"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "from db import study_cafe_db" and len(new_lines) > 10:
        # Stop here! This is the duplicate start.
        break
    new_lines.append(line)

# Wait, the last few lines before the duplicate were:
#             "type": "ADMIN_RESET",
# I need to pop the last line if it's incomplete.
while new_lines and "type" not in new_lines[-1] and "ADMIN_RESET" not in new_lines[-1]:
    new_lines.pop()

# The last line should be `            "type": "ADMIN_RESET",\n`
rest_of_file = """            "session_id": req.session_id,
            "status": "closed",
        },
    )
    return {"status": "success", "message": f"{sess.get('table_id')} 좌석의 세션이 초기화되었습니다."}

@router.delete("/admin/chat/{session_id}")
def admin_clear_chat(session_id: str, background_tasks: BackgroundTasks):
    \"\"\"특정 세션의 채팅 메시지 내역을 초기화합니다.\"\"\"
    sess = study_cafe_db.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="해당 세션을 찾을 수 없습니다.")
    
    sess_meta = sess.get("metadata", {})
    sess_meta["messages"] = []
    
    if not study_cafe_db.update_session_metadata(session_id, sess_meta):
        raise HTTPException(status_code=500, detail="메시지 초기화에 실패했습니다.")
    
    background_tasks.add_task(
        mqtt_publish,
        topic=f"mqcafe/{sess.get('store_id', 'ST001')}/update",
        payload={
            "type": "UPDATE",
        },
    )
    return {"status": "success", "message": "채팅 내역이 초기화되었습니다."}

@router.post("/door/open")
def remote_door_open(req: DoorControlRequest, background_tasks: BackgroundTasks):
    \"\"\"
    점주 대시보드에서 '원격 출입문 개방' 버튼 클릭 시 호출
    \"\"\"
    topic = f"mqcafe/{req.store_id}/door/control"
    payload = {"command": "OPEN", "session_id": "remote_admin"}
    print(f"!!! DEBUG ADMIN DOOR OPEN !!! -> topic: {topic}, payload: {payload}")
    if background_tasks:
        background_tasks.add_task(mqtt_publish, topic=topic, payload=payload)
    else:
        mqtt_publish(topic, payload)
        
    return {"status": "success", "message": "출입문 개방 신호를 전송했습니다."}

@router.get("/admin/revenue")
def get_admin_revenue(store_id: str, month: str):
    \"\"\"
    특정 매장의 특정 월(YYYY-MM) 매출액을 조회합니다.
    \"\"\"
    revenue = study_cafe_db.get_monthly_revenue(store_id, month)
    return {
        "store_id": store_id,
        "month": month,
        "revenue": revenue
    }
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
    f.write(rest_of_file)

print("Fixed admin.py successfully!")
