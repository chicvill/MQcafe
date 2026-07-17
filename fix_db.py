import json

with open('backend/data/study_cafe.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update Store Names
new_names = ["운정 산내점", "일산 주엽점", "합정 안내점", "인천 석남점", "서울 종로점"]
stores = data.get('stores', [])
for i in range(min(len(stores), len(new_names))):
    stores[i]['name'] = new_names[i]

# Find the first store ID
first_store_id = stores[0]['store_id'] if stores else 'ST001'

# Update all customers' default store to the first store
for customer in data.get('customers', []):
    customer['store_id'] = first_store_id

with open('backend/data/study_cafe.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("DB updated successfully.")
