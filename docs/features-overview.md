# Hajj and Umrah Travel Aggregator - Features Overview

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Core Features](#core-features)
- [Technical Stack](#technical-stack)
- [Database Architecture](#database-architecture)
- [Machine Learning Components](#machine-learning-components)
- [User Interfaces](#user-interfaces)
- [API Endpoints](#api-endpoints)
- [Deployment Architecture](#deployment-architecture)

---

## 🎯 System Overview

The Hajj and Umrah Travel Aggregator is an intelligent platform that helps customers find the most suitable travel agencies for their pilgrimage needs. The system aggregates information from multiple travel agency websites, processes it using machine learning, and provides personalized recommendations based on customer preferences.

### Key Objectives
- Automate data collection from various Hajj and Umrah travel agency websites
- Provide intelligent, personalized recommendations to customers
- Simplify the process of comparing and selecting travel agencies
- Learn from customer interactions to improve recommendations over time
- Offer a comprehensive back-office system for administrators

---

## 🚀 Core Features

### 1. Automated Web Scraping System

#### 1.1 Multi-Source Scraping
- **Concurrent Scraping**: Utilizes Java Virtual Threads for efficient parallel scraping of multiple websites
- **Configurable Targets**: Administrators can add, remove, and configure scraping targets through the back office
- **Scheduled Jobs**: Automated scraping runs at configurable intervals (daily, weekly, etc.)
- **Error Handling**: Robust error handling with retry mechanisms and failure notifications

#### 1.2 Data Extraction
Extracts comprehensive information including:
- **Package Details**
  - Package name and description
  - Duration (number of days)
  - Hajj or Umrah type
  - Accommodation details (hotels, star ratings)
  - Transportation information
  - Visa processing details
  
- **Pricing Information**
  - Base price
  - Price per person
  - Group discounts
  - Seasonal variations
  - Payment plans
  
- **Services Included**
  - Accommodation (hotel name, location, distance from Haram)
  - Meals (full board, half board, etc.)
  - Transportation (flights, ground transport)
  - Guidance (tour guides, religious scholars)
  - Additional services (SIM cards, laundry, etc.)
  
- **Contact Information**
  - Agency name and address
  - Phone numbers
  - Email addresses
  - Website URL
  - Social media links
  - Office hours
  
- **Departure Information**
  - Departure cities
  - Available departure dates
  - Flight details
  - Connecting flights
  
- **Testimonials & Reviews**
  - Customer testimonials
  - Ratings
  - Review dates
  - Reviewer names (if available)

#### 1.3 Data Validation & Normalization
- **Data Cleaning**: Removes duplicates and inconsistent data
- **Format Standardization**: Normalizes dates, prices, and contact information
- **Quality Checks**: Validates required fields and data integrity
- **Deduplication**: Identifies and merges duplicate packages from the same agency

---

### 2. Intelligent Recommendation System

#### 2.1 Preference-Based Matching
Customers can specify preferences:
- **Budget Range**: Minimum and maximum price
- **Departure City**: Preferred departure location
- **Travel Dates**: Flexible or specific dates
- **Duration**: Number of days
- **Accommodation Preference**: Star rating, location preferences
- **Services Required**: Specific services they want included
- **Group Size**: Solo, family, group travel

#### 2.2 Similarity Search
- **Semantic Search**: Uses sentence transformers to understand the meaning of package descriptions
- **Vector Embeddings**: Converts packages and preferences into 768-dimensional vectors
- **Cosine Similarity**: Finds packages most similar to customer preferences
- **Hybrid Search**: Combines keyword matching with semantic similarity

#### 2.3 Intelligent Ranking
- **Multi-Factor Scoring**: Considers multiple factors:
  - Similarity score
  - Price match
  - Customer ratings
  - Agency reputation
  - Historical success rate
  
- **Machine Learning Classification**: Uses trained models to predict customer satisfaction
- **Personalization**: Learns from user interactions to improve future recommendations

#### 2.4 Explanation & Transparency
- Shows why each package was recommended
- Highlights matching features
- Displays price comparisons
- Shows testimonials from similar customers

---

### 3. Machine Learning & Training System

#### 3.1 Sentence Transformers
- **Model**: Uses pre-trained models like `paraphrase-MiniLM-L6-v2` or `all-mpnet-base-v2`
- **Embedding Generation**: Converts text descriptions into dense vector representations
- **Multilingual Support**: Can handle Arabic and English text
- **Fine-tuning Capability**: Can be fine-tuned on domain-specific data

#### 3.2 Vector Embeddings
- **Package Embeddings**: Each package converted to a 768-dimensional vector
- **Preference Embeddings**: Customer preferences converted to vectors
- **Semantic Understanding**: Captures meaning beyond keywords
- **Similarity Computation**: Efficient cosine similarity calculation

#### 3.3 Classification Models
- **Algorithm**: XGBoost or Random Forest classifier
- **Features**:
  - Package characteristics (price, duration, services)
  - Customer demographics
  - Historical interaction data
  - Seasonal patterns
  
- **Target**: Predicts likelihood of customer satisfaction/conversion
- **Evaluation Metrics**: Accuracy, Precision, Recall, F1-Score, AUC-ROC

#### 3.4 Training Pipeline
- **Data Collection**: Aggregates interaction data (clicks, bookings, reviews)
- **Feature Engineering**: Creates relevant features from raw data
- **Model Training**: 
  - Automated training jobs
  - Cross-validation
  - Hyperparameter tuning
  
- **Model Evaluation**: 
  - Test set evaluation
  - A/B testing in production
  - Performance monitoring
  
- **Model Deployment**: 
  - Model versioning
  - Gradual rollout
  - Rollback capability

#### 3.5 Continuous Learning
- **Feedback Loop**: Captures user interactions continuously
- **Incremental Training**: Regular model updates with new data
- **Performance Monitoring**: Tracks recommendation quality metrics
- **Drift Detection**: Identifies when model performance degrades

---

### 4. Advanced Search Capabilities

#### 4.1 Full-Text Search
- **PostgreSQL Full-Text Search**: Fast keyword-based search
- **Autocomplete**: Suggests search terms as users type
- **Filters**: Multiple filter options (price, date, city, services)
- **Sorting**: Sort by price, rating, popularity, or relevance

#### 4.2 Semantic Search
- **Natural Language Queries**: Understands conversational queries
- **Intent Recognition**: Identifies what customers are really looking for
- **Multi-lingual**: Supports Arabic and English searches
- **Contextual Results**: Returns contextually relevant results

#### 4.3 Hybrid Search
- **Combined Approach**: Merges full-text and semantic search results
- **Intelligent Ranking**: Uses ML to rank combined results
- **Faceted Search**: Browse by categories and attributes
- **Search Analytics**: Tracks popular searches and trends

---

### 5. Customer Portal (React.js)

#### 5.1 Home Page
- Featured packages
- Search bar with autocomplete
- Popular destinations
- Recent testimonials
- Trust indicators

#### 5.2 Search & Browse
- Advanced search interface
- Filter panel (price, date, city, services)
- Sort options
- Grid/list view toggle
- Pagination

#### 5.3 Package Details Page
- Comprehensive package information
- Image gallery
- Service breakdown
- Price details
- Agency information
- Testimonials
- Comparison tool
- Inquiry form

#### 5.4 Recommendation Page
- Personalized recommendations
- Preference input form
- Why recommended explanation
- Save favorite packages
- Compare side-by-side

#### 5.5 User Account
- Profile management
- Saved searches
- Favorite packages
- Interaction history
- Booking history

#### 5.6 Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Fast loading times
- Progressive Web App (PWA) capabilities

---

### 6. Back Office (React Admin)

#### 6.1 Dashboard
- **Key Metrics**:
  - Total packages
  - Active travel agencies
  - User statistics
  - Conversion rates
  - Popular packages
  
- **Charts & Graphs**:
  - Traffic analytics
  - Search trends
  - Booking patterns
  - Revenue projections

#### 6.2 Package Management
- View all scraped packages
- Manual package entry
- Edit package details
- Approve/reject packages
- Bulk operations
- Export to CSV/Excel

#### 6.3 Travel Agency Management
- Agency profiles
- Contact information
- Performance metrics
- Commission tracking
- Verification status

#### 6.4 Scraping Configuration
- Add/remove scraping targets
- Configure scraping rules
- Schedule scraping jobs
- View scraping logs
- Error monitoring
- Success rate tracking

#### 6.5 Training Management
- Initiate training jobs
- View training history
- Model performance metrics
- Feature importance
- Training data statistics
- Model versioning

#### 6.6 User Management
- Customer accounts
- Admin users
- Role-based access control
- Activity logs
- Permission management

#### 6.7 Content Management
- Testimonials moderation
- Static page content
- FAQ management
- Email templates
- Notification templates

#### 6.8 Analytics & Reporting
- **User Behavior**:
  - Page views
  - Click-through rates
  - Conversion funnels
  - Session duration
  
- **Business Metrics**:
  - Popular packages
  - Top agencies
  - Revenue reports
  - Customer lifetime value
  
- **System Health**:
  - API performance
  - Database metrics
  - Cache hit rates
  - Error rates

---

## 🛠️ Technical Stack

### Backend (Java Spring Boot)

#### 6.1 Framework & Core
- **Spring Boot 3.2+**: Latest version with Virtual Threads support
- **Java 21+**: LTS version with Virtual Threads (Project Loom)
- **Spring WebFlux**: Reactive programming support
- **Spring Data JPA**: Database access layer
- **Spring Security**: Authentication and authorization
- **Spring Cloud**: Microservices support (optional for scaling)

#### 6.2 Virtual Threads
- **Lightweight Concurrency**: Handle thousands of concurrent requests
- **Non-blocking I/O**: Efficient resource utilization
- **Scraping**: Parallel scraping of multiple websites
- **API Performance**: High-throughput request handling

#### 6.3 Additional Libraries
- **Jsoup**: HTML parsing for web scraping
- **Selenium WebDriver**: For JavaScript-heavy websites
- **Quartz Scheduler**: Job scheduling for scraping
- **Jackson**: JSON serialization/deserialization
- **Lombok**: Reduce boilerplate code
- **MapStruct**: DTO mapping
- **Hibernate Validator**: Input validation
- **Resilience4j**: Circuit breaker, retry, rate limiting

#### 6.4 API Documentation
- **SpringDoc OpenAPI**: Automatic API documentation
- **Swagger UI**: Interactive API documentation

---

### Frontend (React.js)

#### 6.5 Customer Portal
- **React 18+**: Latest React version
- **React Router v6**: Client-side routing
- **Redux Toolkit**: State management
- **React Query**: Server state management and caching
- **Axios**: HTTP client
- **Material-UI (MUI)**: Component library
- **Formik + Yup**: Form handling and validation
- **React Helmet**: SEO optimization
- **date-fns**: Date manipulation
- **recharts**: Data visualization

#### 6.6 Back Office (React Admin)
- **React Admin 4+**: Admin framework
- **ra-data-simple-rest**: REST data provider
- **Material-UI**: UI components
- **ra-input-rich-text**: Rich text editor
- **Custom Components**: Domain-specific components

---

### Machine Learning Infrastructure

#### 6.7 ML Services (Python)
- **FastAPI**: High-performance API framework
- **Sentence Transformers**: Pre-trained embedding models
- **scikit-learn**: ML algorithms and utilities
- **XGBoost**: Gradient boosting classifier
- **NumPy & Pandas**: Data manipulation
- **PyTorch**: Deep learning framework
- **ONNX**: Model serialization for production
- **Hugging Face Transformers**: NLP models

#### 6.8 Model Serving
- **FastAPI**: REST API for model inference
- **Docker**: Containerization
- **GPU Support**: CUDA for acceleration
- **Batch Processing**: Efficient batch inference
- **Model Versioning**: Track model versions

---

## 🗄️ Database Architecture

### Primary Database: PostgreSQL

#### Why PostgreSQL?
- **Robust & Reliable**: ACID compliance, proven in production
- **Advanced Features**: JSON support, full-text search, arrays
- **Scalability**: Handles large datasets efficiently
- **Extensions**: Rich ecosystem (PostGIS, pg_trgm, etc.)
- **Open Source**: No licensing costs

#### Schema Design

##### 1. Travel Agencies Table
```sql
CREATE TABLE travel_agencies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 2. Packages Table
```sql
CREATE TABLE packages (
    id BIGSERIAL PRIMARY KEY,
    agency_id BIGINT REFERENCES travel_agencies(id),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'HAJJ', 'UMRAH'
    duration_days INTEGER,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    accommodation_details JSONB,
    services_included JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scraped_at TIMESTAMP,
    source_url VARCHAR(500)
);

CREATE INDEX idx_packages_agency ON packages(agency_id);
CREATE INDEX idx_packages_type ON packages(type);
CREATE INDEX idx_packages_price ON packages(price);
CREATE INDEX idx_packages_active ON packages(is_active);
```

##### 3. Departure Cities Table
```sql
CREATE TABLE departure_cities (
    id BIGSERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    airport_code VARCHAR(10),
    is_popular BOOLEAN DEFAULT FALSE
);

CREATE TABLE package_departure_cities (
    package_id BIGINT REFERENCES packages(id) ON DELETE CASCADE,
    city_id BIGINT REFERENCES departure_cities(id),
    departure_dates JSONB, -- Array of available dates
    PRIMARY KEY (package_id, city_id)
);
```

##### 4. Testimonials Table
```sql
CREATE TABLE testimonials (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT REFERENCES packages(id) ON DELETE CASCADE,
    agency_id BIGINT REFERENCES travel_agencies(id),
    customer_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_testimonials_package ON testimonials(package_id);
CREATE INDEX idx_testimonials_agency ON testimonials(agency_id);
```

##### 5. Customers Table
```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    preferred_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

##### 6. User Preferences Table
```sql
CREATE TABLE user_preferences (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    preferred_departure_city VARCHAR(100),
    preferred_duration INTEGER,
    preferred_services JSONB,
    travel_dates_flexible BOOLEAN DEFAULT TRUE,
    group_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 7. Interactions Table
```sql
CREATE TABLE interactions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id),
    package_id BIGINT REFERENCES packages(id),
    interaction_type VARCHAR(50), -- 'VIEW', 'SAVE', 'INQUIRY', 'BOOKING'
    interaction_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactions_customer ON interactions(customer_id);
CREATE INDEX idx_interactions_package ON interactions(package_id);
CREATE INDEX idx_interactions_type ON interactions(interaction_type);
CREATE INDEX idx_interactions_date ON interactions(created_at);
```

##### 8. Training Metadata Table
```sql
CREATE TABLE training_metadata (
    id BIGSERIAL PRIMARY KEY,
    model_type VARCHAR(100), -- 'CLASSIFIER', 'EMBEDDINGS'
    model_version VARCHAR(50),
    training_date TIMESTAMP,
    metrics JSONB, -- Accuracy, F1, etc.
    hyperparameters JSONB,
    data_size INTEGER,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Vector Database: Pinecone / Milvus / Weaviate

#### Why Vector Database?
- **Optimized for Similarity Search**: Fast nearest neighbor search
- **High-Dimensional Vectors**: Efficiently handles 768-dimensional embeddings
- **Scalability**: Handles millions of vectors
- **Real-time Updates**: Add/update vectors on the fly
- **Metadata Filtering**: Combine vector search with filters

#### Recommended: **Milvus**

##### Why Milvus?
- **Open Source**: No vendor lock-in
- **High Performance**: Sub-100ms queries
- **Scalable**: Distributed architecture
- **Flexible**: Multiple index types (HNSW, IVF, etc.)
- **Cost-Effective**: Self-hosted option

##### Alternative: **Pinecone**
- **Managed Service**: No infrastructure management
- **Easy Integration**: Simple API
- **Automatic Scaling**: Handles growth automatically
- **Higher Cost**: Pay per query and storage

#### Vector Schema

##### Package Embeddings Collection
```python
{
    "collection_name": "package_embeddings",
    "dimension": 768,
    "index_type": "HNSW",  # Hierarchical Navigable Small World
    "metric_type": "COSINE",
    "fields": [
        {"name": "id", "type": "INT64", "primary": True},
        {"name": "package_id", "type": "INT64"},
        {"name": "embedding", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "agency_id", "type": "INT64"},
        {"name": "type", "type": "VARCHAR"},  # 'HAJJ', 'UMRAH'
        {"name": "price", "type": "FLOAT"},
        {"name": "created_at", "type": "INT64"}
    ]
}
```

##### Preference Embeddings Collection
```python
{
    "collection_name": "preference_embeddings",
    "dimension": 768,
    "index_type": "HNSW",
    "metric_type": "COSINE",
    "fields": [
        {"name": "id", "type": "INT64", "primary": True},
        {"name": "customer_id", "type": "INT64"},
        {"name": "embedding", "type": "FLOAT_VECTOR", "dim": 768},
        {"name": "created_at", "type": "INT64"}
    ]
}
```

---

### Cache: Redis

#### Why Redis?
- **In-Memory Speed**: Sub-millisecond latency
- **Rich Data Structures**: Strings, hashes, lists, sets, sorted sets
- **TTL Support**: Automatic expiration
- **Pub/Sub**: Real-time messaging
- **Persistence Options**: RDB and AOF

#### Use Cases
1. **Session Storage**: User sessions with automatic expiration
2. **API Response Caching**: Cache frequently accessed data
3. **Rate Limiting**: Track API usage per user
4. **Recommendation Caching**: Cache personalized recommendations
5. **Search Results**: Cache search query results
6. **Leaderboards**: Popular packages using sorted sets

#### Cache Keys Structure
```
# Sessions
session:{userId}:{sessionId} -> {session_data}

# Package cache
package:{packageId} -> {package_json}
package:list:{filters_hash} -> [package_ids]

# Recommendations
recommendations:{userId}:{preferences_hash} -> [package_ids]

# Search results
search:{query_hash}:{filters} -> [package_ids]

# Rate limiting
ratelimit:{userId}:{endpoint} -> count

# Popular packages (sorted set)
popular:packages -> {package_id: score}
```

---

### Object Storage: MinIO / AWS S3

#### Why Object Storage?
- **Scalable**: Unlimited storage capacity
- **Cost-Effective**: Cheaper than block storage
- **Durability**: High durability (99.999999999%)
- **Accessible**: HTTP-based access

#### Recommended: **MinIO** (for self-hosting) or **AWS S3** (managed)

#### Buckets Structure
```
training-data/
├── raw/
│   ├── interactions/
│   ├── packages/
│   └── preferences/
├── processed/
│   ├── train/
│   ├── validation/
│   └── test/
└── features/

model-artifacts/
├── embeddings/
│   ├── v1.0/
│   └── v2.0/
├── classifiers/
│   ├── v1.0/
│   └── v2.0/
└── metadata/

scraped-images/
├── agencies/
│   └── logos/
└── packages/
    └── photos/
```

---

## 🤖 Machine Learning Components

### 1. Sentence Transformers

#### Model Selection
**Recommended Model: `paraphrase-multilingual-MiniLM-L12-v2`**

##### Why This Model?
- **Multilingual**: Supports English and Arabic
- **Efficient**: Only 118M parameters, fast inference
- **Quality**: Good balance between speed and accuracy
- **Dimension**: 384 dimensions (can use larger models for better quality)

##### Alternative Models
- `all-mpnet-base-v2`: 768 dimensions, English only, higher quality
- `all-MiniLM-L6-v2`: 384 dimensions, English only, very fast
- `paraphrase-xlm-r-multilingual-v1`: Multilingual, larger

#### Implementation
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# Generate embeddings
package_text = "5-star hotel near Haram, full board, includes flights from Jakarta"
embedding = model.encode(package_text)  # Returns 384-dim vector
```

---

### 2. Classification Model

#### Algorithm: **XGBoost**

##### Why XGBoost?
- **High Performance**: State-of-the-art for tabular data
- **Handles Mixed Data**: Numerical and categorical features
- **Feature Importance**: Understand what drives predictions
- **Regularization**: Prevents overfitting
- **Fast Training**: Efficient gradient boosting

##### Features for Classification
```python
features = {
    # Package features
    'price': float,
    'duration_days': int,
    'hotel_rating': float,
    'distance_to_haram': float,
    'services_count': int,
    
    # Agency features
    'agency_rating': float,
    'agency_review_count': int,
    'agency_years_in_business': int,
    
    # Customer features
    'customer_budget_match': float,  # 0-1 score
    'customer_service_match': float,  # 0-1 score
    'customer_location_match': bool,
    
    # Embedding similarity
    'embedding_similarity': float,  # Cosine similarity score
    
    # Temporal features
    'is_peak_season': bool,
    'days_until_departure': int,
    
    # Historical features
    'package_view_count': int,
    'package_inquiry_rate': float,
    'package_booking_rate': float
}
```

##### Target Variable
```python
target = 'customer_satisfaction'  # Binary: 1 (satisfied) or 0 (not satisfied)
# Or multi-class: 'high_interest', 'medium_interest', 'low_interest'
```

##### Training Pipeline
```python
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Load data
X, y = load_training_data()

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train
model = xgb.XGBClassifier(
    max_depth=6,
    learning_rate=0.1,
    n_estimators=100,
    objective='binary:logistic'
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
```

---

### 3. Similarity Search

#### Algorithm: **Cosine Similarity**

##### Why Cosine Similarity?
- **Angle-Based**: Measures angle between vectors, not magnitude
- **Range**: -1 to 1 (0 to 1 for normalized vectors)
- **Interpretable**: Easy to understand similarity scores
- **Efficient**: Fast computation with optimized libraries

##### Implementation
```python
import numpy as np

def cosine_similarity(vec1, vec2):
    """Calculate cosine similarity between two vectors."""
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

# In practice, use Milvus/Pinecone built-in similarity search
```

##### Threshold Strategy
- **High Relevance**: Similarity > 0.8
- **Medium Relevance**: 0.6 < Similarity ≤ 0.8
- **Low Relevance**: 0.4 < Similarity ≤ 0.6
- **Not Relevant**: Similarity ≤ 0.4

---

### 4. Training Data Collection

#### Data Sources
1. **User Interactions**
   - Page views
   - Click-through data
   - Time spent on package page
   - Saved packages
   - Inquiries sent

2. **Booking Data**
   - Successful bookings
   - Package selected
   - Final price paid
   - Customer demographics

3. **Feedback Data**
   - Explicit ratings
   - Reviews
   - Survey responses
   - Customer service interactions

#### Data Labeling Strategy
- **Implicit Signals**: Booking = positive label
- **Explicit Feedback**: Direct ratings
- **Negative Sampling**: Viewed but not saved/inquired
- **Time-Based**: Recent interactions weighted more

---

## 🖥️ User Interfaces

### Customer Portal Features

#### 1. Homepage
- Hero section with search
- Featured packages
- Popular destinations
- Testimonials carousel
- Trust badges
- Call-to-action buttons

#### 2. Search Results
- Filter sidebar (collapsible on mobile)
- Sort options dropdown
- Package cards with key info
- Pagination
- "Load more" option
- Map view (optional)

#### 3. Package Details
- Image gallery (lightbox)
- Package information tabs
- Service checklist
- Price breakdown
- Agency profile card
- Testimonials section
- Similar packages
- Inquiry form
- Share buttons

#### 4. Recommendations
- Preference input wizard
- Recommended packages grid
- Match score indicators
- "Why recommended" badges
- Comparison tool
- Refine preferences

#### 5. User Dashboard
- Saved packages
- Search history
- Inquiry status
- Account settings
- Notifications

---

### Back Office Features

#### 1. Dashboard
- KPI cards (total packages, agencies, users)
- Charts (traffic, conversions)
- Recent activity feed
- System health indicators

#### 2. Data Tables
- Packages list with filters
- Agencies list
- Users list
- Testimonials queue
- Sortable columns
- Bulk actions
- Export buttons

#### 3. Forms
- Package editor (rich text)
- Agency profile form
- Scraping configuration
- User management
- Settings panels

#### 4. Analytics
- Line charts (trends over time)
- Bar charts (comparisons)
- Pie charts (distributions)
- Heatmaps (user behavior)
- Date range selector

---

## 🔌 API Endpoints

### Public APIs

#### Packages
```
GET    /api/packages              - List packages (paginated, filtered)
GET    /api/packages/{id}         - Get package details
GET    /api/packages/search       - Search packages
GET    /api/packages/featured     - Get featured packages
```

#### Recommendations
```
POST   /api/recommendations       - Get personalized recommendations
POST   /api/recommendations/similar - Get similar packages
```

#### Agencies
```
GET    /api/agencies              - List agencies
GET    /api/agencies/{id}         - Get agency details
```

#### Testimonials
```
GET    /api/testimonials          - List testimonials
GET    /api/packages/{id}/testimonials - Get package testimonials
```

---

### Authenticated APIs

#### User
```
POST   /api/auth/register         - Register new user
POST   /api/auth/login            - User login
POST   /api/auth/logout           - User logout
GET    /api/user/profile          - Get user profile
PUT    /api/user/profile          - Update profile
```

#### Preferences
```
GET    /api/user/preferences      - Get user preferences
PUT    /api/user/preferences      - Update preferences
```

#### Interactions
```
POST   /api/interactions          - Log interaction
GET    /api/user/saved            - Get saved packages
POST   /api/user/saved/{id}       - Save package
DELETE /api/user/saved/{id}       - Remove saved package
```

---

### Admin APIs

#### Package Management
```
GET    /api/admin/packages        - List all packages
POST   /api/admin/packages        - Create package
PUT    /api/admin/packages/{id}   - Update package
DELETE /api/admin/packages/{id}   - Delete package
POST   /api/admin/packages/bulk   - Bulk operations
```

#### Scraping
```
GET    /api/admin/scraping/targets - List scraping targets
POST   /api/admin/scraping/targets - Add scraping target
PUT    /api/admin/scraping/targets/{id} - Update target
DELETE /api/admin/scraping/targets/{id} - Remove target
POST   /api/admin/scraping/run    - Trigger scraping job
GET    /api/admin/scraping/logs   - View scraping logs
```

#### Training
```
POST   /api/admin/training/start  - Start training job
GET    /api/admin/training/status - Get training status
GET    /api/admin/training/history - Training history
GET    /api/admin/training/metrics - Model metrics
```

#### Analytics
```
GET    /api/admin/analytics/dashboard - Dashboard data
GET    /api/admin/analytics/packages  - Package analytics
GET    /api/admin/analytics/users     - User analytics
GET    /api/admin/analytics/conversion - Conversion metrics
```

---

## 🚀 Deployment Architecture

### Containerization (Docker)

#### Services
```yaml
services:
  # Backend API
  api:
    image: hajj-umrah-api:latest
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=production
      - JAVA_OPTS=-XX:+UseZGC -XX:+UseContainerSupport
    
  # ML Service (Python)
  ml-service:
    image: hajj-umrah-ml:latest
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
  
  # Frontend
  frontend:
    image: hajj-umrah-frontend:latest
    ports:
      - "3000:80"
  
  # Back Office
  backoffice:
    image: hajj-umrah-backoffice:latest
    ports:
      - "3001:80"
  
  # PostgreSQL
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=hajj_umrah
      - POSTGRES_PASSWORD=${DB_PASSWORD}
  
  # Milvus
  milvus:
    image: milvusdb/milvus:latest
    ports:
      - "19530:19530"
    volumes:
      - milvus_data:/var/lib/milvus
  
  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  # MinIO
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
```

---

### Scaling Strategy

#### Horizontal Scaling
- **API**: Multiple instances behind load balancer
- **ML Service**: Separate instances for embedding and classification
- **Database**: Read replicas for PostgreSQL
- **Cache**: Redis cluster mode

#### Vertical Scaling
- **ML Service**: GPU instances for faster inference
- **Database**: Larger instances for more connections
- **Milvus**: More memory for vector storage

---

### Monitoring & Observability

#### Metrics
- **Application Metrics**: Prometheus
- **APM**: Spring Boot Actuator, Micrometer
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger or Zipkin
- **Dashboards**: Grafana

#### Alerts
- API response time > 500ms
- Error rate > 1%
- Database connection pool exhaustion
- ML service unavailable
- Scraping job failures

---

## 📊 Performance Targets

### Response Times
- **API Endpoints**: < 200ms (p95)
- **Search**: < 300ms (p95)
- **Recommendations**: < 500ms (p95)
- **Page Load**: < 2s (First Contentful Paint)

### Throughput
- **API**: 1000+ requests/second
- **Concurrent Users**: 10,000+
- **Scraping**: 100+ websites/hour

### Availability
- **Uptime**: 99.9% (excluding maintenance)
- **RTO**: < 1 hour
- **RPO**: < 15 minutes

---

## 🔒 Security Considerations

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- OAuth2 integration (optional)
- Session management with Redis

### Data Protection
- HTTPS/TLS everywhere
- Database encryption at rest
- Password hashing (bcrypt)
- Sensitive data masking in logs

### API Security
- Rate limiting per user/IP
- CORS configuration
- Input validation
- SQL injection prevention (parameterized queries)
- XSS prevention

### Compliance
- GDPR considerations (if applicable)
- Data retention policies
- User consent management
- Right to be forgotten

---

## 🎯 Success Metrics

### Business Metrics
- Number of packages aggregated
- Number of travel agencies covered
- User engagement rate
- Conversion rate (inquiries to bookings)
- Customer satisfaction score

### Technical Metrics
- Recommendation accuracy
- Search relevance
- Model performance (F1-score)
- System uptime
- API response times

### ML Metrics
- Embedding similarity distribution
- Classification accuracy
- Precision & recall
- A/B test results
- Model drift detection

---

## 🗺️ Roadmap

### Phase 1: MVP (Months 1-3)
- ✅ Basic web scraping
- ✅ PostgreSQL database
- ✅ Simple search
- ✅ Customer portal
- ✅ Back office

### Phase 2: ML Integration (Months 4-6)
- ✅ Sentence transformers
- ✅ Vector database
- ✅ Recommendation engine
- ✅ Basic classification

### Phase 3: Advanced Features (Months 7-9)
- Advanced filtering
- Comparison tool
- Email notifications
- Mobile app (React Native)

### Phase 4: Optimization (Months 10-12)
- Performance tuning
- A/B testing framework
- Advanced analytics
- Model improvements

---

## 📞 Support & Maintenance

### Regular Tasks
- **Daily**: Monitor scraping jobs, check system health
- **Weekly**: Review new packages, moderate testimonials
- **Monthly**: Model retraining, database optimization
- **Quarterly**: Security audits, dependency updates

### Backup Strategy
- **Database**: Daily full backup, hourly incremental
- **Vectors**: Weekly backup
- **Models**: Version control, artifact storage
- **Retention**: 30 days online, 1 year archived

---

## 📚 Documentation

### Technical Documentation
- API documentation (OpenAPI/Swagger)
- Database schema documentation
- Deployment guide
- Development setup guide

### User Documentation
- Customer portal user guide
- Back office manual
- FAQ section
- Video tutorials

---

## 🎉 Conclusion

This Hajj and Umrah Travel Aggregator is a comprehensive solution that combines modern web technologies, machine learning, and intelligent data processing to help customers find the perfect travel package for their pilgrimage. The system is designed to be scalable, maintainable, and continuously improving through machine learning.

### Key Differentiators
1. **Automated Aggregation**: Reduces manual data entry
2. **Intelligent Recommendations**: ML-powered personalization
3. **Comprehensive Information**: All details in one place
4. **User-Friendly**: Easy for customers and admins
5. **Scalable Architecture**: Grows with your business
6. **Continuous Learning**: Improves over time

---

*For questions or support, please refer to the technical documentation or contact the development team.*
