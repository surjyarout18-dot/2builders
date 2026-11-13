import sys, os
sys.path.insert(0, os.path.abspath('.'))

import io
from fastapi import UploadFile
from backend.app.database import SessionLocal
from backend.app.api.twobuilders_api import (
    upload_plan_file,
    start_plan_analysis,
    AnalyseRequest,
    get_plan_details,
    apply_review_answers,
    AnswersPayload,
    AnswerItem
)

def test_twobuilders_e2e_pipeline(synthetic_floorplan_bytes):
    db = SessionLocal()
    try:
        upload = UploadFile(file=io.BytesIO(synthetic_floorplan_bytes), filename="twobuilders_plan.jpg")

        # Step 1: Upload
        up_res = upload_plan_file(file=upload, db=db)
        plan_id = up_res["planId"]
        assert plan_id is not None
        assert "sourceUrl" in up_res

        # Step 2: Analyse
        req = AnalyseRequest(
            interiorStyle="Modern",
            ceilingHeightMm=3050,
            furnished=True,
            northDeg=0.0,
            realWidthM=9.0
        )
        ana_res = start_plan_analysis(plan_id=plan_id, payload=req, db=db)
        assert ana_res["status"].lower() == "completed"

        # Step 3: Get Details
        plan_doc = get_plan_details(plan_id=plan_id, db=db)
        assert plan_doc["ceilingMm"] == 3050
        assert len(plan_doc["walls"]) > 0

        # Step 4: Apply Answers
        ans_res = apply_review_answers(plan_id=plan_id, payload=AnswersPayload(answers=[
            AnswerItem(questionId="q3_scale_check", selected="Yes, dimensions are exact")
        ]), db=db)
        assert ans_res["version"] >= 1
    finally:
        db.close()
