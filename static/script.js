

document.querySelectorAll('.title-btn').forEach(button => {
    button.addEventListener('click', function() {
        const contentBox = this.nextElementSibling;
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        
        // Toggle visibility
        contentBox.style.display = isExpanded ? 'none' : 'block';
        this.setAttribute('aria-expanded', !isExpanded);
        
        // Animation fluide
        contentBox.classList.toggle('active');
    });
});

// Quiz Generation - Ajout de la gestion d'erreur et sécurité
document.getElementById("generate_quiz_btn")?.addEventListener("click", function() {
    const generateQuizBtn = this;
    const selectedSegmentation = document.getElementById("segmentation_select").value;

    // Validation de base
    if (!selectedSegmentation) {
        alert("Please select a segmentation first!");
        return;
    }

    generateQuizBtn.disabled = true;
    generateQuizBtn.innerHTML = '<span class="spinner"></span> Generating...';

    fetch('/generate-quiz-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentation_title: selectedSegmentation })
    })
    .then(async response => {
        generateQuizBtn.disabled = false;
        generateQuizBtn.textContent = "Generate Quiz"; // Utilisation de textContent pour la sécurité
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(error.message || "Server error");
        }
        return response.json();
    })
    .then(data => {
        if (!data?.questions) throw new Error("Invalid quiz data");
        
        const quizContainer = document.getElementById('quiz-container');
        quizContainer.style.display = 'block';
        quizContainer.innerHTML = ''; // Nettoyage sécurisé

        // Construction du quiz avec sanitization
        const quizTitle = document.createElement('h2');
        quizTitle.textContent = data.title || "Quiz";
        quizTitle.id = 'quiz-title';
        quizContainer.appendChild(quizTitle);

        const questionsContainer = document.createElement('div');
        questionsContainer.id = 'quiz-questions';
        
        data.questions.forEach((question, index) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question';
            
            const questionText = document.createElement('h3');
            questionText.textContent = `${index + 1}. ${question.questionText || "Question text missing"}`;
            
            const optionsList = document.createElement('ul');
            optionsList.className = 'options';
            
            if (Array.isArray(question.options)) {
                question.options.forEach(option => {
                    const listItem = document.createElement('li');
                    const input = document.createElement('input');
                    input.type = question.type === 'single-choice' ? 'radio' : 'checkbox';
                    input.name = `question${index}`;
                    input.value = option.optionId;
                    input.dataset.correct = option.isCorrect;
                    
                    const label = document.createElement('label');
                    label.textContent = option.optionText;
                    
                    listItem.append(input, label);
                    optionsList.appendChild(listItem);
                });
            } else {
                optionsList.innerHTML = '<li>No options available</li>';
            }
            
            questionElement.append(questionText, optionsList);
            questionsContainer.appendChild(questionElement);
        });
        
        quizContainer.appendChild(questionsContainer);
        document.getElementById("finish_quiz_btn").style.display = "block";
    })
    .catch(error => {
        console.error("Quiz generation error:", error);
        alert(`Error: ${error.message}`);
    });
});

// Quiz Submission - Logique de validation améliorée
document.getElementById("finish_quiz_btn")?.addEventListener("click", function() {
    const questions = document.querySelectorAll('.question');
    let correctCount = 0;
    let allAnswered = true;

    questions.forEach((question, index) => {
        // Reset des états
        question.classList.remove('unanswered', 'correct', 'incorrect');
        const feedback = question.querySelector('.feedback');
        if (feedback) feedback.remove();

        // Vérification des réponses
        const options = question.querySelectorAll('input');
        const checkedOptions = Array.from(options).filter(opt => opt.checked);
        const correctOptions = Array.from(options).filter(opt => opt.dataset.correct === "true");

        // Validation des réponses
        if (checkedOptions.length === 0) {
            allAnswered = false;
            question.classList.add('unanswered');
            return;
        }

        // Vérification de l'exactitude
        const isCorrect = checkedOptions.every(opt => opt.dataset.correct === "true") &&
                         correctOptions.every(opt => opt.checked);

        // Feedback
        const feedbackElement = document.createElement('div');
        feedbackElement.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedbackElement.innerHTML = `
            <strong>Correct Answers:</strong> 
            ${correctOptions.map(opt => opt.nextElementSibling.textContent).join(', ')}
        `;
        
        question.appendChild(feedbackElement);
        if (isCorrect) correctCount++;
    });

    if (!allAnswered) {
        alert("Please answer all questions before submitting!");
        return;
    }

    // Calcul du score
    const score = Math.round((correctCount / questions.length) * 100);
    const explanation = getScoreExplanation(score);
    
    // Envoi des résultats
    const quizResult = {
        quiz_title: document.getElementById('quiz-title').textContent,
        total_questions: questions.length,
        correct_answers: correctCount,
        score: score,
        feedback: explanation
    };

    submitQuizResult(quizResult)
        .then(() => {
            document.getElementById("generate-explication-btn").style.display = "block";
            showScoreAlert(score, explanation, correctCount, questions.length);
        })
        .catch(error => console.error("Submission error:", error));
});

// Helper functions
function getScoreExplanation(score) {
    if (score <= 30) return "Needs improvement: Review key concepts.";
    if (score <= 60) return "Good: Understands basics but needs practice.";
    if (score < 100) return "Excellent: Strong understanding.";
    return "Perfect: Complete mastery!";
}

async function submitQuizResult(result) {
    const response = await fetch('/submit-quiz-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    });
    if (!response.ok) throw new Error('Failed to save results');
    return response.json();
}

function showScoreAlert(score, explanation, correct, total) {
    let scoreContainer = document.getElementById('quiz-score-container');

    if (!scoreContainer) {
        scoreContainer = document.createElement('div');
        scoreContainer.id = 'quiz-score-container';
        scoreContainer.className = 'score-container';
        document.body.appendChild(scoreContainer);
    }

    scoreContainer.innerHTML = `
        <h3>Quiz Results: ${score}%</h3>
        <p>${explanation}</p>
        <p>Correct: ${correct}/${total}</p>
    `;

    scoreContainer.style.display = 'block'; // Rendre visible
    const closeBtn = document.createElement('button');
closeBtn.textContent = '✖';
closeBtn.style.float = 'right';
closeBtn.style.cursor = 'pointer';
closeBtn.onclick = () => scoreContainer.style.display = 'none';
scoreContainer.prepend(closeBtn);
document.getElementById('quiz-container').dataset.score = score;


}


// Explanation Generation - Gestion d'erreur améliorée
document.getElementById("generate-explication-btn")?.addEventListener("click", async function() {
    try {
        // 1. Validation des données
        const selectElement = document.getElementById("segmentation_select");
        if (!selectElement) throw new Error("Sélecteur de segmentation introuvable");
        
        const scoreElement = document.getElementById('quiz-score-container');
        const scoreText = scoreElement ? scoreElement.querySelector('h3')?.textContent.match(/\d+/) : null;
        const score = scoreText ? parseInt(scoreText[0], 10) : NaN;
        
        if (isNaN(score)) {
            alert("Erreur : Score introuvable. Veuillez soumettre le quiz avant de générer l'explication.");
            return;
        }

        // 2. Parsing sécurisé
        let selectedSegmentation;
        try {
            selectedSegmentation = JSON.parse(selectElement.value);
        } catch (e) {
            throw new Error("Format de segmentation invalide");
        }

        // 3. Validation des champs requis
        if (!selectedSegmentation?.Segmentationcontent || !selectedSegmentation?.Segmentationtitle) {
            throw new Error("Données de segmentation incomplètes");
        }

        // 4. Configuration de la requête
        const response = await fetch('/generate-explication-ai', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') // Si nécessaire
            },
            body: JSON.stringify({
                segmentation_content: selectedSegmentation.Segmentationcontent,
                score: score
            })
        });

        // 5. Gestion des réponses HTTP
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Erreur HTTP: ${response.status}`);
        }

        // 6. Traitement des données
        const data = await response.json();
        if (!data.generated_explanation) {
            throw new Error("Réponse du serveur invalide");
        }

        // 7. Affichage des résultats avec un format organisé
        const container = document.querySelector('.explanations-container');
        container.innerHTML = `
            <h3>Explications (Niveau ${data.score_level || 'Non spécifié'})</h3>
            <div class="explanation-content">
                ${generateExplanationContent(data.generated_explanation)}
                <div class="metadata">
                    <span>Score: ${score}%</span>
                    <span>Segment: ${selectedSegmentation.Segmentationtitle}</span>
                </div>
            </div>
        `;
        container.style.display = 'block';
        document.getElementById("generate-exercises-btn").style.display = 'block'; // Affiche le bouton

    } catch (error) {
        console.error("Erreur détaillée:", error);
        
        // Messages d'erreur utilisateur-friendly
        let userMessage = error.message;
        if (error.message.includes("Failed to fetch")) {
            userMessage = "Problème de connexion au serveur";
        } else if (error.message.includes("Format de segmentation")) {
            userMessage = "Format de segmentation invalide, actualisez la page";
        }

        alert(`Erreur: ${userMessage}`);
    }
});

function generateExplanationContent(explanation) {
    // Exemple de fonction pour formater le texte généré par l'IA
    const paragraphs = explanation.split('\n').map(p => `<p>${p}</p>`).join('');
    return paragraphs;
}
document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.getElementById('generate-exercises-btn');
    const exercisesContainer = document.getElementById('exercises');

    generateButton.addEventListener('click', function() {
        // Récupérer les informations nécessaires
        const segmentationContent = getSegmentationContent(); // Fonction à définir selon votre logique
        const score = getQuizScore(); // Fonction à définir pour obtenir le score du quiz

        if (!segmentationContent || score === null || isNaN(score)) {
            alert('Please ensure you have completed the quiz and the segmentation is selected.');
            return;
        }

        // Appeler l'API pour générer les exercices
        fetch('/generate-exercises-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                segmentation_content: segmentationContent,
                score: score
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                exercisesContainer.innerHTML = `<p>Error: ${data.error}</p>`;
            } else {
                // Afficher les exercices générés
                displayExercises(data.exercises); // Corrigé pour utiliser `data.exercises`
            }
        })
        .catch(error => {
            exercisesContainer.innerHTML = `<p>Error generating exercises: ${error}</p>`;
        });
    });

    // Fonction pour afficher les exercices générés
    function displayExercises(exercises) {
        exercisesContainer.innerHTML = ''; // Réinitialiser le contenu

        // Assurez-vous que les exercices sont sous forme d'un tableau
        if (Array.isArray(exercises)) {
            exercises.forEach(exercise => {
                const exerciseElement = document.createElement('div');
                exerciseElement.classList.add('exercise');

                const title = document.createElement('h3');
                title.textContent = exercise.title;

                const description = document.createElement('p');
                description.textContent = exercise.description;

                exerciseElement.appendChild(title);
                exerciseElement.appendChild(description);

                exercisesContainer.appendChild(exerciseElement);
            });
        } else {
            exercisesContainer.innerHTML = '<p>No exercises available.</p>';
        }
    }

    // Exemple de fonction pour obtenir le contenu de la segmentation
    function getSegmentationContent() {
        const selectedSegmentation = document.getElementById('segmentation_select').value;
        return selectedSegmentation ? JSON.parse(selectedSegmentation).Segmentationcontent : null;
    }

    // Exemple de fonction pour obtenir le score du quiz
    function getQuizScore() {
        const scoreElement = document.getElementById('quiz-score-container');
        const scoreText = scoreElement ? scoreElement.querySelector('h3')?.textContent.match(/\d+/) : null;
        return scoreText ? parseInt(scoreText[0], 10) : null;
    }
});
