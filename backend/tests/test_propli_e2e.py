import sys, os
sys.path.insert(0, os.path.abspath('.'))

import io
from fastapi import UploadFile
from backend.app.database import SessionLocal
from backend.app.api.propli_api import upload_plan_file, start_plan_analysis, AnalyseRequest, get_plan_details, apply_review_answers, AnswersPayload, AnswerItem

img_path = r'C:/Users/surjy/.gemini/antigravity/brain/2a9b51af-0336-4a18-9bc2-ffe4e7ff7e6e/.user_uploaded/media_1794032952424_93a7f716.jpg'

db = SessionLocal()
try:
    with open(img_path, 'rb') as f:
        file_bytes = f.read()

    upload = UploadFile(file=io.BytesIO(file_bytes), filename="propli_2bhk.jpg")

    # Step 1: Upload
    up_res = upload_plan_file(file=upload, db=db)
    plan_id = up_res["planId"]
    print("Step 1 Upload:", up_res)

    # Step 2: Analyse
    req = AnalyseRequest(
        interiorStyle="Modern",
        ceilingHeightMm=3050,
        furnished=True,
        northDeg=0.0,
        realWidthM=9.0
    )
    ana_res = start_plan_analysis(plan_id=plan_id, payload=req, db=db)
    print("Step 2 Analysis completed:", ana_res["status"])

    # Step 3: Get Details
    plan_doc = get_plan_details(plan_id=plan_id, db=db)
    print("Plan Schema:", plan_doc["schema"])
    print("Ceiling Mm:", plan_doc["ceilingMm"])
    print("Nodes count:", len(plan_doc["nodes"]))
    print("Walls count:", len(plan_doc["walls"]))
    print("Openings count:", len(plan_doc["openings"]))
    print("Rooms count:", len(plan_doc["rooms"]))
    print("Fixtures count:", len(plan_doc["fixtures"]))
    print("Review questions count:", len(plan_doc["review"]["questions"]))
    for q in plan_doc["review"]["questions"]:
        print(f"  Question: {q['question']} | Selected: {q['selected']}")

    print("Vastu Score:", plan_doc["vastu"]["score"], f"({plan_doc['vastu']['grade']})")
    for r in plan_doc["vastu"]["rooms"]:
        print(f"  Vastu Room: {r['name']} -> Zone: {r['zone']} ({r['zoneName']}) | Status: {r['status']}")

    # Step 4: Apply Answers
    ans_res = apply_review_answers(plan_id=plan_id, payload=AnswersPayload(answers=[
        AnswerItem(questionId="q3_scale_check", selected="Yes, dimensions are exact")
    ]), db=db)
    print("Answers applied, new version:", ans_res["version"])

finally:
    db.close()

