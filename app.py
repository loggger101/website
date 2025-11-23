from flask import Flask, render_template

app = Flask(__name__)

# -------------------- DATA TO CUSTOMIZE -------------------- #

PROFILE = {
    "name": "Logan M Edwards",
    "tagline": "Astronomy & Astrophysics • Planetary Science",
    "location": "Florida Institute of Technology",
    "short_bio": (
        "I'm an undergraduate astrophysics and planetary science student interested in "
        "astrophysics, machine learning, and sustainability. "
        "This site collects my projects, resume, and contact info."
    ),
    # Your real resume link (from the notebook)
    "resume_url": "https://docs.google.com/document/d/1T1VPBCBDUQVW2uaW2T3e4NaG_YdWj5j8yJY9Th-yxUA/edit?usp=sharing",
}

PROJECTS = [
    {
        "title": "Star Cataloguing Deep Learning Model",
        "subtitle": "Spectral classification and stellar type prediction",
        "description": (
            "Built a deep learning pipeline to classify stars by spectral type and "
            "evolutionary stage using survey images and metadata from sources like "
            "Gaia and Pan-STARRS."
        ),
        "tech": ["Python", "TensorFlow/PyTorch", "Astro-data (Gaia, Pan-STARRS)"],
        "link": "https://www.kaggle.com/datasets/loggger/fpv-images",  # your Kaggle dataset
    },
    {
        "title": "Drone Target Identification Model",
        "subtitle": "Object detection and valid/invalid target classification",
        "description": (
            "Developed a YOLO-based detection + custom classifier pipeline to distinguish "
            "valid targets from background and non-target objects in aerial imagery."
        ),
        "tech": ["Python", "YOLO", "Keras/TensorFlow", "OpenCV"],
        "link": "https://www.kaggle.com/datasets/loggger/star-image-bundles",
    },
]

SOCIAL_LINKS = {
    "email": "ledwards2024@my.fit.edu",
    "kagglehub": "https://www.kaggle.com/loggger",
    "linkedin": "https://www.linkedin.com/in/logan-edwards-shf/",
    "sistershope": "https://www.sistershopefoundation.org/board-logan",
}

# -------------------- ROUTES -------------------- #

@app.route("/")
def home():
    resume_url = PROFILE.get("resume_url")
    return render_template(
        "index.html",
        profile=PROFILE,
        projects=PROJECTS,
        social=SOCIAL_LINKS,
        resume_url=resume_url,
    )


if __name__ == "__main__":
    # For running locally: python app.py
    app.run(debug=True)
