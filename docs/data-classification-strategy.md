# Data Classification Strategy for Scraped Hajj & Umrah Packages

## 📋 Table of Contents
- [Overview](#overview)
- [Classification Approaches](#classification-approaches)
- [Feature Engineering](#feature-engineering)
- [Classification Models](#classification-models)
- [Implementation Strategy](#implementation-strategy)
- [Training Pipeline](#training-pipeline)
- [Real-World Examples](#real-world-examples)

---

## 🎯 Overview

Data classification helps organize and categorize scraped packages to improve search, recommendations, and user experience. We'll classify data across multiple dimensions:

1. **Package Quality Classification** (Premium, Standard, Budget)
2. **Package Type Classification** (Hajj, Umrah, Combined)
3. **Service Level Classification** (Luxury, Comfort, Economy)
4. **Customer Segment Classification** (Family, Individual, Group, Senior)
5. **Relevance Classification** (Highly Relevant, Moderate, Low) - for recommendations
6. **Sentiment Classification** (for testimonials)

---

## 🔍 Classification Approaches

### 1. Rule-Based Classification (Initial Approach)

**Best for**: Quick categorization of structured data

#### Example: Package Quality Classification

```java
public enum PackageQuality {
    PREMIUM, STANDARD, BUDGET
}

public class RuleBasedClassifier {
    
    public PackageQuality classifyByPrice(BigDecimal price, int durationDays) {
        BigDecimal pricePerDay = price.divide(
            BigDecimal.valueOf(durationDays), 
            RoundingMode.HALF_UP
        );
        
        if (pricePerDay.compareTo(new BigDecimal("500")) >= 0) {
            return PackageQuality.PREMIUM;
        } else if (pricePerDay.compareTo(new BigDecimal("250")) >= 0) {
            return PackageQuality.STANDARD;
        } else {
            return PackageQuality.BUDGET;
        }
    }
    
    public PackageQuality classifyByHotelRating(Double hotelRating) {
        if (hotelRating >= 4.5) {
            return PackageQuality.PREMIUM;
        } else if (hotelRating >= 3.5) {
            return PackageQuality.STANDARD;
        } else {
            return PackageQuality.BUDGET;
        }
    }
    
    public PackageQuality classifyByDistanceToHaram(Integer distanceMeters) {
        if (distanceMeters <= 500) {
            return PackageQuality.PREMIUM;
        } else if (distanceMeters <= 2000) {
            return PackageQuality.STANDARD;
        } else {
            return PackageQuality.BUDGET;
        }
    }
    
    public PackageQuality classifyCombined(Package pkg) {
        int premiumScore = 0;
        int standardScore = 0;
        int budgetScore = 0;
        
        // Vote based on multiple factors
        PackageQuality priceClass = classifyByPrice(pkg.getPrice(), pkg.getDurationDays());
        PackageQuality hotelClass = classifyByHotelRating(pkg.getHotelRating());
        PackageQuality distanceClass = classifyByDistanceToHaram(pkg.getDistanceToHaram());
        
        // Count votes
        if (priceClass == PackageQuality.PREMIUM) premiumScore++;
        if (hotelClass == PackageQuality.PREMIUM) premiumScore++;
        if (distanceClass == PackageQuality.PREMIUM) premiumScore++;
        
        if (priceClass == PackageQuality.STANDARD) standardScore++;
        if (hotelClass == PackageQuality.STANDARD) standardScore++;
        if (distanceClass == PackageQuality.STANDARD) standardScore++;
        
        if (priceClass == PackageQuality.BUDGET) budgetScore++;
        if (hotelClass == PackageQuality.BUDGET) budgetScore++;
        if (distanceClass == PackageQuality.BUDGET) budgetScore++;
        
        // Return majority vote
        if (premiumScore >= 2) return PackageQuality.PREMIUM;
        if (budgetScore >= 2) return PackageQuality.BUDGET;
        return PackageQuality.STANDARD;
    }
}
```

#### Example: Service Level Classification

```java
public enum ServiceLevel {
    LUXURY, COMFORT, ECONOMY
}

public class ServiceLevelClassifier {
    
    public ServiceLevel classify(Package pkg) {
        int luxuryPoints = 0;
        int economyPoints = 0;
        
        // Accommodation
        if (pkg.getHotelRating() >= 5.0) luxuryPoints += 3;
        else if (pkg.getHotelRating() < 3.0) economyPoints += 2;
        
        // Distance to Haram
        if (pkg.getDistanceToHaram() <= 300) luxuryPoints += 2;
        else if (pkg.getDistanceToHaram() > 3000) economyPoints += 2;
        
        // Meals
        if (pkg.getMealPlan().equals("FULL_BOARD")) luxuryPoints += 1;
        else if (pkg.getMealPlan().equals("SELF_CATERING")) economyPoints += 2;
        
        // Transportation
        if (pkg.hasPrivateTransport()) luxuryPoints += 2;
        else if (pkg.hasSharedTransport()) economyPoints += 1;
        
        // Airline class
        if (pkg.getFlightClass().equals("BUSINESS") || 
            pkg.getFlightClass().equals("FIRST")) {
            luxuryPoints += 3;
        } else if (pkg.getFlightClass().equals("ECONOMY")) {
            economyPoints += 1;
        }
        
        // Additional services
        if (pkg.hasPersonalGuide()) luxuryPoints += 2;
        if (pkg.hasVIPServices()) luxuryPoints += 2;
        if (pkg.getServicesIncluded().size() > 10) luxuryPoints += 1;
        
        // Classification decision
        if (luxuryPoints >= 8) return ServiceLevel.LUXURY;
        if (economyPoints >= 6) return ServiceLevel.ECONOMY;
        return ServiceLevel.COMFORT;
    }
}
```

---

### 2. Machine Learning Classification (Advanced Approach)

**Best for**: Complex patterns, continuous improvement, personalization

#### A. Package Quality Classification with ML

##### Features for Classification

```python
# features.py
import pandas as pd
import numpy as np

def extract_package_features(package_data):
    """Extract features for package quality classification"""
    
    features = {
        # Price features
        'price': package_data['price'],
        'price_per_day': package_data['price'] / package_data['duration_days'],
        'price_percentile': calculate_percentile(package_data['price']),
        
        # Accommodation features
        'hotel_rating': package_data['hotel_rating'],
        'distance_to_haram_meters': package_data['distance_to_haram'],
        'distance_to_haram_category': categorize_distance(package_data['distance_to_haram']),
        'room_type_score': encode_room_type(package_data['room_type']),
        
        # Service features
        'meal_plan_score': encode_meal_plan(package_data['meal_plan']),
        'total_services_count': len(package_data['services_included']),
        'has_private_transport': int(package_data.get('has_private_transport', False)),
        'has_tour_guide': int(package_data.get('has_tour_guide', False)),
        'has_religious_guide': int(package_data.get('has_religious_guide', False)),
        'has_vip_services': int(package_data.get('has_vip_services', False)),
        
        # Flight features
        'flight_class_score': encode_flight_class(package_data['flight_class']),
        'is_direct_flight': int(package_data.get('is_direct_flight', False)),
        'airline_rating': package_data.get('airline_rating', 3.5),
        
        # Agency features
        'agency_rating': package_data['agency_rating'],
        'agency_total_reviews': package_data['agency_total_reviews'],
        'agency_is_verified': int(package_data['agency_is_verified']),
        'agency_years_in_business': package_data.get('agency_years', 5),
        
        # Package popularity
        'view_count': package_data.get('view_count', 0),
        'inquiry_count': package_data.get('inquiry_count', 0),
        'booking_count': package_data.get('booking_count', 0),
        'average_testimonial_rating': package_data.get('avg_rating', 0),
        
        # Text-based features (from embeddings)
        'description_quality_score': calculate_description_quality(package_data['description']),
        'description_length': len(package_data.get('description', '')),
        
        # Temporal features
        'days_until_departure': (package_data['departure_date'] - pd.Timestamp.now()).days,
        'is_peak_season': int(is_peak_season(package_data['departure_date'])),
    }
    
    return features

def categorize_distance(distance_meters):
    """Categorize distance to Haram"""
    if distance_meters <= 500:
        return 4  # Very close
    elif distance_meters <= 1000:
        return 3  # Close
    elif distance_meters <= 2000:
        return 2  # Moderate
    else:
        return 1  # Far

def encode_meal_plan(meal_plan):
    """Encode meal plan as numeric score"""
    mapping = {
        'FULL_BOARD': 4,
        'HALF_BOARD': 3,
        'BREAKFAST_ONLY': 2,
        'SELF_CATERING': 1,
        'NONE': 0
    }
    return mapping.get(meal_plan, 1)

def encode_flight_class(flight_class):
    """Encode flight class as numeric score"""
    mapping = {
        'FIRST': 5,
        'BUSINESS': 4,
        'PREMIUM_ECONOMY': 3,
        'ECONOMY': 2,
        'UNKNOWN': 1
    }
    return mapping.get(flight_class, 2)

def encode_room_type(room_type):
    """Encode room type as numeric score"""
    mapping = {
        'SUITE': 5,
        'DELUXE': 4,
        'SUPERIOR': 3,
        'STANDARD': 2,
        'BASIC': 1
    }
    return mapping.get(room_type, 2)

def is_peak_season(departure_date):
    """Check if departure is during peak season"""
    month = departure_date.month
    # Ramadan months and Hajj season
    peak_months = [8, 9, 10, 11, 12]  # Adjust based on Islamic calendar
    return month in peak_months

def calculate_description_quality(description):
    """Calculate quality score based on description"""
    if not description:
        return 0
    
    score = 0
    # Length check
    if len(description) > 200:
        score += 2
    elif len(description) > 100:
        score += 1
    
    # Keywords check (indicates detailed description)
    quality_keywords = [
        'luxury', 'premium', 'exclusive', 'vip', 'deluxe',
        'comfortable', 'modern', 'renovated', 'spacious'
    ]
    score += sum(1 for keyword in quality_keywords if keyword in description.lower())
    
    return min(score, 10)  # Cap at 10
```

##### Training the Classifier

```python
# train_classifier.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
from sklearn.metrics import classification_report, confusion_matrix
import joblib

class PackageQualityClassifier:
    """Classifier for package quality (Premium, Standard, Budget)"""
    
    def __init__(self, model_type='xgboost'):
        self.model_type = model_type
        self.scaler = StandardScaler()
        self.model = None
        self.feature_names = None
        
    def prepare_data(self, df):
        """Prepare features and labels"""
        # Extract features for all packages
        features_list = []
        for _, row in df.iterrows():
            features = extract_package_features(row)
            features_list.append(features)
        
        X = pd.DataFrame(features_list)
        self.feature_names = X.columns.tolist()
        
        # Target variable
        y = df['quality_label']  # 0: Budget, 1: Standard, 2: Premium
        
        return X, y
    
    def train(self, X_train, y_train):
        """Train the classifier"""
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        if self.model_type == 'xgboost':
            self.model = xgb.XGBClassifier(
                max_depth=6,
                learning_rate=0.1,
                n_estimators=200,
                objective='multi:softmax',
                num_class=3,
                eval_metric='mlogloss',
                random_state=42
            )
        elif self.model_type == 'random_forest':
            self.model = RandomForestClassifier(
                n_estimators=200,
                max_depth=10,
                min_samples_split=10,
                random_state=42,
                n_jobs=-1
            )
        
        # Train
        self.model.fit(X_train_scaled, y_train)
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train_scaled, y_train, 
            cv=5, scoring='f1_weighted'
        )
        print(f"Cross-validation F1 scores: {cv_scores}")
        print(f"Mean CV F1: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
        
    def evaluate(self, X_test, y_test):
        """Evaluate the model"""
        X_test_scaled = self.scaler.transform(X_test)
        y_pred = self.model.predict(X_test_scaled)
        
        print("\nClassification Report:")
        print(classification_report(
            y_test, y_pred,
            target_names=['Budget', 'Standard', 'Premium']
        ))
        
        print("\nConfusion Matrix:")
        print(confusion_matrix(y_test, y_pred))
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            importance_df = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            print("\nTop 10 Most Important Features:")
            print(importance_df.head(10))
        
        return y_pred
    
    def predict(self, X):
        """Predict quality class"""
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    def predict_proba(self, X):
        """Predict class probabilities"""
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)
    
    def save_model(self, path='models/package_quality_classifier.pkl'):
        """Save model to disk"""
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'model_type': self.model_type
        }
        joblib.dump(model_data, path)
        print(f"Model saved to {path}")
    
    def load_model(self, path='models/package_quality_classifier.pkl'):
        """Load model from disk"""
        model_data = joblib.load(path)
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.model_type = model_data['model_type']
        print(f"Model loaded from {path}")

# Training script
if __name__ == "__main__":
    # Load data
    df = pd.read_csv('data/packages_labeled.csv')
    
    # Initialize classifier
    classifier = PackageQualityClassifier(model_type='xgboost')
    
    # Prepare data
    X, y = classifier.prepare_data(df)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    print(f"Class distribution: {y_train.value_counts()}")
    
    # Train
    print("\n=== Training Classifier ===")
    classifier.train(X_train, y_train)
    
    # Evaluate
    print("\n=== Evaluation on Test Set ===")
    classifier.evaluate(X_test, y_test)
    
    # Save model
    classifier.save_model()
```

---

#### B. Customer Segment Classification

This helps recommend appropriate packages based on customer profiles.

```python
# customer_segment_classifier.py
class CustomerSegmentClassifier:
    """Classify customers into segments for targeted recommendations"""
    
    def extract_customer_features(self, customer_data, preference_data):
        """Extract features from customer and preference data"""
        
        features = {
            # Demographics
            'age': customer_data.get('age', 35),
            'is_family': int(preference_data.get('group_size', 1) > 2),
            'is_senior': int(customer_data.get('age', 35) >= 60),
            
            # Budget preferences
            'budget_max': preference_data.get('budget_max', 5000),
            'budget_flexibility': self._calculate_budget_flexibility(preference_data),
            
            # Service preferences
            'prefers_luxury': int(preference_data.get('min_hotel_rating', 3) >= 4.5),
            'prefers_proximity': int(preference_data.get('max_distance_to_haram', 5000) <= 1000),
            'requires_assistance': int(preference_data.get('needs_guide', False)),
            
            # Travel preferences
            'group_size': preference_data.get('group_size', 1),
            'duration_preference': preference_data.get('preferred_duration', 14),
            'flexibility': int(preference_data.get('dates_flexible', True)),
            
            # Historical behavior
            'packages_viewed': customer_data.get('total_packages_viewed', 0),
            'avg_package_price_viewed': customer_data.get('avg_viewed_price', 3000),
            'has_booked_before': int(customer_data.get('booking_count', 0) > 0),
            'avg_rating_given': customer_data.get('avg_rating', 0),
        }
        
        return features
    
    def _calculate_budget_flexibility(self, preference_data):
        """Calculate how flexible customer is with budget"""
        budget_min = preference_data.get('budget_min', 0)
        budget_max = preference_data.get('budget_max', 10000)
        
        if budget_min == 0:
            return 1.0  # Very flexible
        
        flexibility = (budget_max - budget_min) / budget_max
        return flexibility
    
    def classify_segment(self, customer_data, preference_data):
        """
        Classify customer into segments:
        - LUXURY_SEEKER: High budget, prefers premium services
        - VALUE_CONSCIOUS: Moderate budget, seeks good value
        - BUDGET_TRAVELER: Low budget, price-sensitive
        - FAMILY_GROUP: Traveling with family, specific needs
        - SENIOR_PILGRIM: Elderly travelers, need comfort and assistance
        - FIRST_TIMER: New to Hajj/Umrah, needs guidance
        """
        
        features = self.extract_customer_features(customer_data, preference_data)
        
        # Rule-based classification (can be replaced with ML)
        if features['is_senior']:
            return 'SENIOR_PILGRIM'
        
        if features['is_family']:
            return 'FAMILY_GROUP'
        
        if not features['has_booked_before'] and features['requires_assistance']:
            return 'FIRST_TIMER'
        
        if features['prefers_luxury'] and features['budget_max'] > 7000:
            return 'LUXURY_SEEKER'
        
        if features['budget_max'] < 3000:
            return 'BUDGET_TRAVELER'
        
        return 'VALUE_CONSCIOUS'
```

---

#### C. Relevance Classification for Recommendations

This predicts how relevant a package is to a specific customer.

```python
# relevance_classifier.py
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
import xgboost as xgb

class RelevanceClassifier:
    """Predict relevance of packages to customer preferences"""
    
    def __init__(self):
        self.model = xgb.XGBClassifier(
            max_depth=5,
            learning_rate=0.1,
            n_estimators=150,
            objective='binary:logistic',
            eval_metric='auc'
        )
        self.scaler = StandardScaler()
    
    def extract_features(self, package_data, customer_preference, embedding_similarity):
        """Extract features for relevance prediction"""
        
        features = {
            # Embedding similarity (most important!)
            'embedding_similarity': embedding_similarity,
            
            # Budget match
            'price': package_data['price'],
            'price_in_budget': int(
                customer_preference['budget_min'] <= package_data['price'] <= 
                customer_preference['budget_max']
            ),
            'price_distance_from_budget': abs(
                package_data['price'] - 
                (customer_preference['budget_max'] + customer_preference['budget_min']) / 2
            ),
            
            # Duration match
            'duration_match_score': 1 - abs(
                package_data['duration_days'] - 
                customer_preference.get('preferred_duration', 14)
            ) / 30,
            
            # Location match
            'departure_city_match': int(
                package_data['departure_city'] == 
                customer_preference.get('departure_city')
            ),
            
            # Service match
            'hotel_rating_match': int(
                package_data['hotel_rating'] >= 
                customer_preference.get('min_hotel_rating', 3.0)
            ),
            'distance_to_haram_match': int(
                package_data['distance_to_haram'] <= 
                customer_preference.get('max_distance_to_haram', 5000)
            ),
            
            # Service requirements
            'required_services_matched': self._count_matched_services(
                package_data['services_included'],
                customer_preference.get('required_services', [])
            ),
            
            # Quality indicators
            'agency_rating': package_data['agency_rating'],
            'package_popularity': np.log1p(package_data['view_count']),
            'testimonial_rating': package_data.get('avg_testimonial_rating', 0),
            
            # Temporal features
            'days_until_departure': (
                package_data['departure_date'] - pd.Timestamp.now()
            ).days,
            'is_preferred_season': int(
                self._is_preferred_season(
                    package_data['departure_date'],
                    customer_preference.get('preferred_months', [])
                )
            ),
        }
        
        return features
    
    def _count_matched_services(self, package_services, required_services):
        """Count how many required services are included"""
        if not required_services:
            return 1.0
        
        matched = sum(1 for service in required_services if service in package_services)
        return matched / len(required_services)
    
    def _is_preferred_season(self, departure_date, preferred_months):
        """Check if departure is in preferred months"""
        if not preferred_months:
            return True
        return departure_date.month in preferred_months
    
    def train(self, training_data):
        """
        Training data should include:
        - package_data
        - customer_preference
        - embedding_similarity
        - label (1 if customer booked/inquired, 0 otherwise)
        """
        X_list = []
        y_list = []
        
        for item in training_data:
            features = self.extract_features(
                item['package_data'],
                item['customer_preference'],
                item['embedding_similarity']
            )
            X_list.append(features)
            y_list.append(item['label'])
        
        X = pd.DataFrame(X_list)
        y = np.array(y_list)
        
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        
        print("Relevance classifier trained successfully")
    
    def predict_relevance(self, package_data, customer_preference, embedding_similarity):
        """Predict relevance score (0-1)"""
        features = self.extract_features(
            package_data,
            customer_preference,
            embedding_similarity
        )
        X = pd.DataFrame([features])
        X_scaled = self.scaler.transform(X)
        
        # Return probability of being relevant
        return self.model.predict_proba(X_scaled)[0][1]
```

---

### 3. Sentiment Classification for Testimonials

```python
# sentiment_classifier.py
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch

class TestimonialSentimentClassifier:
    """Classify sentiment of customer testimonials"""
    
    def __init__(self, model_name='nlptown/bert-base-multilingual-uncased-sentiment'):
        """
        Initialize sentiment classifier
        Uses multilingual model that supports Arabic and English
        """
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        
    def classify_sentiment(self, text):
        """
        Classify sentiment of testimonial text
        Returns: sentiment label and score
        """
        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)
        
        # Predict
        with torch.no_grad():
            outputs = self.model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Get sentiment
        sentiment_score = predictions[0].cpu().numpy()
        sentiment_class = sentiment_score.argmax()
        
        # Map to sentiment labels (1-5 stars)
        sentiment_mapping = {
            0: 'VERY_NEGATIVE',
            1: 'NEGATIVE',
            2: 'NEUTRAL',
            3: 'POSITIVE',
            4: 'VERY_POSITIVE'
        }
        
        return {
            'sentiment': sentiment_mapping[sentiment_class],
            'confidence': float(sentiment_score[sentiment_class]),
            'star_rating': sentiment_class + 1,
            'scores': {
                'very_negative': float(sentiment_score[0]),
                'negative': float(sentiment_score[1]),
                'neutral': float(sentiment_score[2]),
                'positive': float(sentiment_score[3]),
                'very_positive': float(sentiment_score[4])
            }
        }
    
    def validate_testimonial_rating(self, text, claimed_rating):
        """
        Validate if testimonial text matches claimed rating
        Useful for detecting fake reviews
        """
        sentiment = self.classify_sentiment(text)
        predicted_rating = sentiment['star_rating']
        
        # Allow 1 star difference as acceptable
        is_consistent = abs(predicted_rating - claimed_rating) <= 1
        
        return {
            'is_consistent': is_consistent,
            'claimed_rating': claimed_rating,
            'predicted_rating': predicted_rating,
            'difference': abs(predicted_rating - claimed_rating),
            'confidence': sentiment['confidence']
        }
```

---

## 🛠️ Feature Engineering

### Text Features from Descriptions

```python
# text_features.py
from sentence_transformers import SentenceTransformer
import re

class TextFeatureExtractor:
    """Extract features from package descriptions"""
    
    def __init__(self):
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    
    def extract_all_features(self, description):
        """Extract comprehensive text features"""
        
        features = {
            # Basic stats
            'char_count': len(description),
            'word_count': len(description.split()),
            'sentence_count': len(re.split(r'[.!?]', description)),
            'avg_word_length': np.mean([len(word) for word in description.split()]),
            
            # Quality indicators
            'has_numbers': int(bool(re.search(r'\d', description))),
            'has_bullet_points': int('•' in description or '*' in description),
            'has_sections': int(any(marker in description for marker in [':', '\n\n'])),
            
            # Keyword presence
            'luxury_keywords': self._count_keywords(description, [
                'luxury', 'premium', 'vip', 'exclusive', 'deluxe', 'suite'
            ]),
            'comfort_keywords': self._count_keywords(description, [
                'comfortable', 'modern', 'clean', 'spacious', 'convenient'
            ]),
            'service_keywords': self._count_keywords(description, [
                'guide', 'assistance', 'support', '24/7', 'concierge'
            ]),
            'location_keywords': self._count_keywords(description, [
                'haram', 'makkah', 'madinah', 'close', 'walking distance'
            ]),
            
            # Embedding
            'embedding': self.model.encode(description)
        }
        
        return features
    
    def _count_keywords(self, text, keywords):
        """Count occurrences of keywords"""
        text_lower = text.lower()
        return sum(text_lower.count(keyword) for keyword in keywords)
```

---

## 🔄 Implementation Strategy

### Integration with Spring Boot Backend

```java
// ClassificationService.java
@Service
public class ClassificationService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${ml.service.url}")
    private String mlServiceUrl;
    
    private final Cache<Long, PackageQuality> qualityCache;
    
    public ClassificationService() {
        this.qualityCache = Caffeine.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS)
            .maximumSize(10000)
            .build();
    }
    
    /**
     * Classify package quality using ML service
     */
    public PackageQuality classifyPackageQuality(Package pkg) {
        // Check cache first
        PackageQuality cached = qualityCache.getIfPresent(pkg.getId());
        if (cached != null) {
            return cached;
        }
        
        // Prepare request
        ClassificationRequest request = buildClassificationRequest(pkg);
        
        // Call ML service
        ResponseEntity<ClassificationResponse> response = restTemplate.postForEntity(
            mlServiceUrl + "/classify/quality",
            request,
            ClassificationResponse.class
        );
        
        PackageQuality quality = response.getBody().getQualityClass();
        
        // Cache result
        qualityCache.put(pkg.getId(), quality);
        
        return quality;
    }
    
    /**
     * Classify customer segment
     */
    public CustomerSegment classifyCustomerSegment(Customer customer, UserPreference preference) {
        CustomerSegmentRequest request = CustomerSegmentRequest.builder()
            .age(customer.getAge())
            .groupSize(preference.getGroupSize())
            .budgetMax(preference.getBudgetMax())
            .preferredServices(preference.getPreferredServices())
            .build();
        
        ResponseEntity<CustomerSegmentResponse> response = restTemplate.postForEntity(
            mlServiceUrl + "/classify/customer-segment",
            request,
            CustomerSegmentResponse.class
        );
        
        return response.getBody().getSegment();
    }
    
    /**
     * Predict package relevance for customer
     */
    public double predictRelevance(
        Package pkg,
        UserPreference preference,
        double embeddingSimilarity
    ) {
        RelevanceRequest request = RelevanceRequest.builder()
            .packageData(toPackageData(pkg))
            .preferenceData(toPreferenceData(preference))
            .embeddingSimilarity(embeddingSimilarity)
            .build();
        
        ResponseEntity<RelevanceResponse> response = restTemplate.postForEntity(
            mlServiceUrl + "/classify/relevance",
            request,
            RelevanceResponse.class
        );
        
        return response.getBody().getRelevanceScore();
    }
    
    /**
     * Classify testimonial sentiment
     */
    public TestimonialSentiment classifySentiment(String testimonialText) {
        SentimentRequest request = new SentimentRequest(testimonialText);
        
        ResponseEntity<SentimentResponse> response = restTemplate.postForEntity(
            mlServiceUrl + "/classify/sentiment",
            request,
            SentimentResponse.class
        );
        
        return response.getBody().getSentiment();
    }
    
    private ClassificationRequest buildClassificationRequest(Package pkg) {
        return ClassificationRequest.builder()
            .price(pkg.getPrice())
            .durationDays(pkg.getDurationDays())
            .hotelRating(pkg.getHotelRating())
            .distanceToHaram(pkg.getDistanceToHaram())
            .servicesCount(pkg.getServicesIncluded().size())
            .agencyRating(pkg.getAgency().getRating())
            .flightClass(pkg.getFlightClass())
            .mealPlan(pkg.getMealPlan())
            .build();
    }
}
```

---

## 🚂 Training Pipeline

### Automated Training Workflow

```java
// TrainingController.java
@RestController
@RequestMapping("/api/admin/training")
public class TrainingController {
    
    @Autowired
    private TrainingService trainingService;
    
    @PostMapping("/start")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TrainingJobResponse> startTraining(
        @RequestBody TrainingRequest request
    ) {
        String jobId = trainingService.startTrainingJob(request);
        return ResponseEntity.accepted().body(
            new TrainingJobResponse(jobId, "Training job started")
        );
    }
    
    @GetMapping("/status/{jobId}")
    public ResponseEntity<TrainingStatus> getTrainingStatus(@PathVariable String jobId) {
        TrainingStatus status = trainingService.getTrainingStatus(jobId);
        return ResponseEntity.ok(status);
    }
}

// TrainingService.java
@Service
public class TrainingService {
    
    @Autowired
    private InteractionRepository interactionRepository;
    
    @Autowired
    private PackageRepository packageRepository;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${ml.service.url}")
    private String mlServiceUrl;
    
    private final Map<String, TrainingStatus> trainingJobs = new ConcurrentHashMap<>();
    
    public String startTrainingJob(TrainingRequest request) {
        String jobId = UUID.randomUUID().toString();
        
        CompletableFuture.runAsync(() -> {
            try {
                // Update status
                updateStatus(jobId, TrainingPhase.COLLECTING_DATA, 0);
                
                // 1. Collect training data
                List<TrainingExample> examples = collectTrainingData(request);
                updateStatus(jobId, TrainingPhase.COLLECTING_DATA, 30);
                
                // 2. Send to ML service for training
                TrainingDataRequest mlRequest = new TrainingDataRequest(
                    examples,
                    request.getModelType(),
                    request.getHyperparameters()
                );
                
                updateStatus(jobId, TrainingPhase.TRAINING_MODEL, 50);
                
                ResponseEntity<TrainingResultResponse> response = restTemplate.postForEntity(
                    mlServiceUrl + "/train",
                    mlRequest,
                    TrainingResultResponse.class
                );
                
                // 3. Save training metadata
                updateStatus(jobId, TrainingPhase.SAVING_MODEL, 90);
                saveTrainingMetadata(response.getBody());
                
                // 4. Complete
                updateStatus(jobId, TrainingPhase.COMPLETED, 100);
                
            } catch (Exception e) {
                updateStatus(jobId, TrainingPhase.FAILED, 0, e.getMessage());
            }
        });
        
        return jobId;
    }
    
    private List<TrainingExample> collectTrainingData(TrainingRequest request) {
        // Collect interactions (clicks, bookings, etc.)
        LocalDateTime since = LocalDateTime.now().minus(request.getDataPeriodDays(), ChronoUnit.DAYS);
        List<Interaction> interactions = interactionRepository.findAllSince(since);
        
        // Convert to training examples
        return interactions.stream()
            .map(this::interactionToTrainingExample)
            .collect(Collectors.toList());
    }
    
    private TrainingExample interactionToTrainingExample(Interaction interaction) {
        Package pkg = packageRepository.findById(interaction.getPackageId())
            .orElseThrow();
        
        // Label: 1 if inquiry or booking, 0 if just view
        int label = interaction.getType().equals("INQUIRY") || 
                    interaction.getType().equals("BOOKING") ? 1 : 0;
        
        return TrainingExample.builder()
            .packageData(toPackageData(pkg))
            .customerPreference(interaction.getCustomerPreference())
            .label(label)
            .build();
    }
}
```

---

## 📊 Real-World Examples

### Example 1: Classifying Scraped Package

```java
// When scraping completes
@Service
public class ScrapingService {
    
    @Autowired
    private ClassificationService classificationService;
    
    @Autowired
    private PackageRepository packageRepository;
    
    public void processScrapedPackage(ScrapedPackageData scrapedData) {
        // 1. Save to database
        Package pkg = savePackage(scrapedData);
        
        // 2. Classify quality
        PackageQuality quality = classificationService.classifyPackageQuality(pkg);
        pkg.setQuality(quality);
        
        // 3. Classify service level
        ServiceLevel serviceLevel = classificationService.classifyServiceLevel(pkg);
        pkg.setServiceLevel(serviceLevel);
        
        // 4. Generate embeddings
        String description = pkg.getName() + " " + pkg.getDescription();
        float[] embedding = embeddingService.generateEmbedding(description);
        
        // 5. Store in vector database
        vectorService.storeEmbedding(pkg.getId(), embedding, Map.of(
            "quality", quality.name(),
            "serviceLevel", serviceLevel.name(),
            "price", pkg.getPrice().toString()
        ));
        
        // 6. Update package
        packageRepository.save(pkg);
        
        log.info("Package classified: {} - Quality: {}, Service Level: {}",
            pkg.getName(), quality, serviceLevel);
    }
}
```

### Example 2: Using Classification in Recommendations

```java
@Service
public class RecommendationService {
    
    @Autowired
    private ClassificationService classificationService;
    
    @Autowired
    private VectorSearchService vectorSearchService;
    
    public List<PackageRecommendation> getRecommendations(
        Long customerId,
        UserPreference preference
    ) {
        // 1. Classify customer segment
        Customer customer = customerRepository.findById(customerId).orElseThrow();
        CustomerSegment segment = classificationService.classifyCustomerSegment(
            customer,
            preference
        );
        
        // 2. Generate preference embedding
        String preferenceText = buildPreferenceText(preference);
        float[] preferenceEmbedding = embeddingService.generateEmbedding(preferenceText);
        
        // 3. Vector search with filters based on segment
        Map<String, Object> filters = buildSegmentFilters(segment, preference);
        List<VectorSearchResult> vectorResults = vectorSearchService.search(
            preferenceEmbedding,
            filters,
            50  // Get top 50 candidates
        );
        
        // 4. Re-rank using relevance classifier
        List<PackageRecommendation> recommendations = new ArrayList<>();
        
        for (VectorSearchResult result : vectorResults) {
            Package pkg = packageRepository.findById(result.getPackageId()).orElseThrow();
            
            // Predict relevance
            double relevanceScore = classificationService.predictRelevance(
                pkg,
                preference,
                result.getSimilarity()
            );
            
            // Only include if relevance is high enough
            if (relevanceScore > 0.5) {
                recommendations.add(PackageRecommendation.builder()
                    .packageData(pkg)
                    .similarityScore(result.getSimilarity())
                    .relevanceScore(relevanceScore)
                    .combinedScore(0.6 * result.getSimilarity() + 0.4 * relevanceScore)
                    .segment(segment)
                    .build());
            }
        }
        
        // 5. Sort by combined score
        recommendations.sort(Comparator.comparing(
            PackageRecommendation::getCombinedScore
        ).reversed());
        
        // 6. Return top 10
        return recommendations.stream()
            .limit(10)
            .collect(Collectors.toList());
    }
    
    private Map<String, Object> buildSegmentFilters(
        CustomerSegment segment,
        UserPreference preference
    ) {
        Map<String, Object> filters = new HashMap<>();
        
        // Add budget filter
        filters.put("price", Map.of(
            "$gte", preference.getBudgetMin(),
            "$lte", preference.getBudgetMax()
        ));
        
        // Add segment-specific filters
        switch (segment) {
            case LUXURY_SEEKER:
                filters.put("quality", "PREMIUM");
                break;
            case BUDGET_TRAVELER:
                filters.put("quality", "BUDGET");
                break;
            case SENIOR_PILGRIM:
                filters.put("serviceLevel", List.of("LUXURY", "COMFORT"));
                break;
            // ... other segments
        }
        
        return filters;
    }
}
```

---

## 🎯 Summary

### Classification Types Implemented:

1. ✅ **Package Quality**: Premium, Standard, Budget
2. ✅ **Service Level**: Luxury, Comfort, Economy
3. ✅ **Customer Segment**: Luxury Seeker, Value Conscious, Budget Traveler, etc.
4. ✅ **Relevance**: How relevant a package is to customer preferences
5. ✅ **Sentiment**: Classify testimonial sentiment

### Benefits:

- **Better Organization**: Structured data classification
- **Improved Search**: Filter by quality and service level
- **Personalized Recommendations**: Segment-based targeting
- **Quality Control**: Automatic quality assessment
- **Trust Building**: Sentiment analysis of testimonials
- **Continuous Learning**: Models improve over time

### Next Steps:

1. Collect labeled training data
2. Train initial models
3. Deploy to production
4. Monitor performance
5. Retrain periodically
6. A/B test improvements
