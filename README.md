# 🎓 Assistant Éducatif IA - Plateforme QCM Intelligente

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.0%2B-lightgrey)](https://flask.palletsprojects.com/)
[![spaCy](https://img.shields.io/badge/spaCy-3.0%2B-orange)](https://spacy.io/)

## 📝 Description

Une application web intelligente qui génère des QCM personnalisés avec :
- Analyse sémantique des réponses (NLP avec spaCy)
- Adaptation automatique à 3 niveaux de difficulté
- Feedback personnalisé basé sur les erreurs
- Cache Redis pour des performances optimales

## ✨ Fonctionnalités

### Pour les Élèves
- 📊 Génération dynamique de QCM adaptatifs
- 🔍 Analyse approfondie des réponses libres
- 🎯 Recommandations personnalisées

  

### Prérequis
- Python 3.8+
- Redis Server

### Installation
```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-user/assistant-educatif-ia.git
cd assistant-educatif-ia

# 2. Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Installer les dépendances
pip install -r requirements.txt
python -m spacy download fr_core_news_md

# 4. Configurer l'environnement
cp .env.example .env
# Modifier les variables dans .env selon besoin

# 5. Lancer Redis (dans un autre terminal)
redis-server

# 6. Démarrer l'application
flask run
