from flask import Flask, request, render_template,jsonify
from openai import OpenAI
from PyPDF2 import PdfReader
from classes.classes import QuizResult, Segmentations, QuizData,Explanation
import os
from dotenv import load_dotenv
import json
# Load the environment variables from the .env file 
load_dotenv()
# Initialize the Flask app
app = Flask(__name__)
app.config["DEBUG"] = True  # Active le mode debug


# Initialize the OpenAI client
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_API_BASE_URL") 
)

@app.template_filter('tojson')
def tojson_filter(obj):
    return json.dumps(obj, default=lambda o: o.__dict__)
# Function to parse text using OpenAI API
def parse_event(user_input): 
    try:
        if not user_input:
            return {"error": "No input provided"}
        
        # Call OpenAI API to parse the input
        completion = client.beta.chat.completions.parse(
            model=os.getenv("OPENAI_MODEL_ID"),
            messages=[
                {"role": "system", "content": "Extrait les segmentations de cet fichier."},
                {"role": "user", "content": user_input},
            ],
            response_format=Segmentations 
        )
        # Extract parsed event information
        parsed_event = completion.choices[0].message.parsed 
        return parsed_event
    except Exception as e:
        return {"error": str(e)}

#route to generate quiz
@app.route('/generate-quiz-ai', methods=['POST']) 
def parse_event_(): 
    data = request.json
    segmentation_title = data.get("segmentation_title")
    questionCount = "5"
    singleChoiceCount = "5" 
    multipleChoiceCount = "0"
    print("segmentation_title"+segmentation_title)
    user_input = "prompt : Genere un quiz pour : " + segmentation_title + "questionCount: "+questionCount+" singleChoiceCount: "+singleChoiceCount+" multipleChoiceCount:"+ multipleChoiceCount
    try:
        # Call OpenAI API to parse the input
        completion = client.beta.chat.completions.parse( 
            model=os.getenv("OPENAI_MODEL_ID"),
            messages=[
                {"role": "system", "content": "Geanerate a quiz for user prompt."},
                {"role": "user", "content": user_input},
            ], 
            response_format=QuizData 
        )
        # Extract parsed event information
        response = completion.choices[0].message.parsed 
        return response.dict()
     
    except Exception as e:
        return {"error": str(e)}



@app.route('/generate-explication-ai', methods=['POST'])
def generate_explanation():
    try:
        data = request.json
        seg_content = data.get("segmentation_content")
        score = data.get("score")

        # Détermination du niveau d'explication
        if score <= 30:
            exp_type = "débutant"
        elif 30 < score < 70:
            exp_type = "intermédiaire"
        else:
            exp_type = "expert"

        prompt = f"""
        Générez une explication {exp_type} pour ce contenu pédagogique :
        {seg_content}
        
        L'explication doit :
        - Corriger les erreurs du quiz
        - Donner des exemples concrets
        - Proposer des ressources complémentaires
        - Adapter le niveau à un public {exp_type}
        """

        completion = client.beta.chat.completions.parse(
            model=os.getenv("OPENAI_MODEL_ID"),
            messages=[{
                "role": "system",
                "content": "Vous êtes un tuteur pédagogique expert. Fournissez une explication claire et structurée."
            }, {
                "role": "user",
                "content": prompt,
            }],
            response_format=Explanation
        )

        response = completion.choices[0].message.parsed
        return jsonify(response.to_dict())
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500





# Function to extract text from PDF
def extract_text_from_pdf(file_path):
    try:
        if not os.path.exists(file_path):
            return "File not found"

        reader = PdfReader(file_path)
        extracted_text = ""
        for page in reader.pages:
            extracted_text += page.extract_text()

        return extracted_text

    except Exception as e:
        return f"Error extracting text: {e}"

# Route for the upload form
@app.route('/')
def upload_form():
    return render_template('upload.html')

@app.route('/submit-quiz-result', methods=['POST'])
def submit_quiz_result():
    try:
        data = request.json
        quiz_result = QuizResult(**data)  # Use Pydantic to validate the data


        # Return a success response
        return {"message": "Quiz result saved successfully"}
    except Exception as e:
        return {"error": f"Error saving quiz result: {str(e)}"}


@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return render_template('upload.html', error="No file uploaded.")

        file = request.files['file']
        if file.filename == '':
            return render_template('upload.html', error="No file selected.")

        
        specific_folder = os.path.join(os.getcwd(), 'files')

       
        if not os.path.exists(specific_folder):
            os.makedirs(specific_folder)

        
        file_path = os.path.join(specific_folder, file.filename)
        file.save(file_path)

        # Extract text from the saved PDF file
        extracted_text = extract_text_from_pdf(file_path)
        # Parse event from extracted text
        segmentations = parse_event(extracted_text)
        # Add index to subtitles
        if 'Sous_titres_segmentation' in segmentations:
            segmentations['Sous_titres_segmentation'] = [
                (i + 1, sous_titre) for i, sous_titre in enumerate(segmentations['Sous_titres_segmentation'])
            ]

        # Render the extracted text on the webpage
        return render_template('upload.html', extracted_text=segmentations)
    except Exception as e:
        print(f"Upload error: {e}")  
        return render_template('upload.html', error=f"An error occurred: {e}")
@app.route('/generate-exercises-ai', methods=['POST'])
def generate_exercises():
    try:
        # Récupérer les données envoyées
        data = request.json
        seg_content = data.get("segmentation_content")
        score = data.get("score")

        # Vérification de la validité du score
        if score is None:
            return jsonify({"error": "Score is missing or invalid"}), 400  # Réponse d'erreur si score est None

        # Détermination du niveau d'exercice
        if score <= 30:
            level = "débutant"
        elif 30 < score < 70:
            level = "intermédiaire"
        else:
            level = "expert"

        # Prompt pour générer des exercices sous forme de problèmes adaptés au niveau
        prompt = f"""
        Générez des exercices sous forme de problèmes pour ce contenu pédagogique :
        {seg_content}
        
        Les exercices doivent être formulés comme des problèmes concrets (par exemple, des calculs, des démonstrations, des applications pratiques) et adaptés au niveau {level}. Voici les critères :
        - Pour le niveau débutant : Les problèmes doivent être simples et demander des solutions directes.
        - Pour le niveau intermédiaire : Les problèmes doivent être un peu plus complexes, avec des étapes intermédiaires ou des explications à détailler.
        - Pour le niveau expert : Les problèmes doivent être approfondis, nécessitant une réflexion poussée et des réponses détaillées.
        
        Chaque problème doit être accompagné de la réponse complète et des étapes de résolution.
        """

        # Appel à l'API OpenAI pour générer les exercices sous forme de problèmes
        completion = client.beta.chat.completions.create(
            model=os.getenv("OPENAI_MODEL_ID"),
            messages=[{
                "role": "system",
                "content": "Vous êtes un expert pédagogique. Fournissez des exercices sous forme de problèmes concrets adaptés au niveau de l'étudiant."
            }, {
                "role": "user",
                "content": prompt,
            }]
        )

        # Extraction des exercices générés
        response = completion['choices'][0]['message']['content']
        return jsonify({"exercises": response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
if __name__ == '__main__':
    port = os.getenv('PORT')  # Use PORT environment variable if available
    app.run(debug=True, host='0.0.0.0', port=int(port))  
    
