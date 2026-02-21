# Intelligent Web Scraping Strategy for Diverse Hajj & Umrah Websites

## 📋 Table of Contents
- [The Challenge](#the-challenge)
- [Solution Approaches](#solution-approaches)
- [Implementation Strategies](#implementation-strategies)
- [Site-Specific Scrapers](#site-specific-scrapers)
- [AI-Powered Content Detection](#ai-powered-content-detection)
- [Configuration Management](#configuration-management)
- [Data Extraction Patterns](#data-extraction-patterns)
- [Error Handling & Validation](#error-handling--validation)

---

## 🎯 The Challenge

When scraping multiple Hajj and Umrah websites, each site has:
- **Different HTML structures** (div classes, IDs, tags)
- **Different naming conventions** (price vs cost vs rate)
- **Different layouts** (tables, cards, lists)
- **Different data organization** (all on one page vs multiple pages)
- **Different languages** (English, Arabic, mixed)

**How does Jsoup know what's what?**

The answer: **It doesn't automatically!** We need to teach it through:
1. **Site-specific scraping configurations**
2. **Pattern-based content detection**
3. **AI-powered content recognition**
4. **Semantic analysis using NLP**

---

## 🛠️ Solution Approaches

### Approach 1: Site-Specific Scraper Configurations (Recommended for Start)

Create a configuration for each website that defines exactly where to find data.

#### Configuration Structure

```json
{
  "site_id": "umroh_indonesia_com",
  "base_url": "https://www.umrohindonesia.com",
  "package_list_url": "https://www.umrohindonesia.com/paket-umroh",
  "scraping_rules": {
    "package_list": {
      "container_selector": "div.package-list",
      "item_selector": "div.package-card",
      "pagination": {
        "type": "url_pattern",
        "pattern": "?page={page}",
        "max_pages": 10
      }
    },
    "package_details": {
      "name": {
        "selector": "h1.package-title",
        "attribute": "text",
        "required": true
      },
      "price": {
        "selectors": ["span.price", "div.cost", "p.rate"],
        "attribute": "text",
        "required": true,
        "pattern": "\\d+[\\d.,]*",
        "type": "currency"
      },
      "duration": {
        "selectors": ["span.duration", "div.days"],
        "attribute": "text",
        "pattern": "(\\d+)\\s*(?:hari|days|day)",
        "type": "integer",
        "group": 1
      },
      "description": {
        "selector": "div.description",
        "attribute": "text",
        "required": false
      },
      "hotel_name": {
        "selectors": ["div.hotel-name", "span.accommodation"],
        "attribute": "text",
        "keywords": ["hotel", "penginapan"]
      },
      "departure_city": {
        "selector": "span.departure",
        "attribute": "text",
        "keywords": ["keberangkatan", "departure", "from"]
      },
      "services_included": {
        "selector": "ul.services li, div.included-services li",
        "attribute": "text",
        "multiple": true,
        "type": "list"
      },
      "itinerary": {
        "container_selector": "div.itinerary",
        "day_selector": "div.day-item",
        "day_title": "h3.day-title",
        "day_description": "p.day-description",
        "type": "structured_list"
      },
      "contact_info": {
        "phone": {
          "selectors": ["a[href^='tel:']", "span.phone"],
          "attribute": "text",
          "pattern": "[\\d\\s\\-\\+\\(\\)]+"
        },
        "email": {
          "selectors": ["a[href^='mailto:']", "span.email"],
          "attribute": "href",
          "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
        },
        "whatsapp": {
          "selectors": ["a[href*='wa.me']", "a[href*='whatsapp']"],
          "attribute": "href",
          "pattern": "\\d+"
        }
      },
      "testimonials": {
        "container_selector": "div.testimonials",
        "item_selector": "div.testimonial-item",
        "customer_name": "span.customer-name",
        "rating": "span.rating",
        "review_text": "p.review-text",
        "review_date": "span.review-date"
      },
      "images": {
        "selectors": ["img.package-image", "div.gallery img"],
        "attribute": "src",
        "multiple": true
      }
    }
  },
  "metadata": {
    "language": "id",
    "currency": "IDR",
    "date_format": "DD/MM/YYYY",
    "timezone": "Asia/Jakarta"
  }
}
```

---

### Approach 2: Pattern-Based Content Detection

When you don't have site-specific configs, detect content by patterns.

#### Java Implementation

```java
// ContentDetector.java
@Component
public class ContentDetector {
    
    private static final Logger log = LoggerFactory.getLogger(ContentDetector.class);
    
    // Pattern definitions for detecting content types
    private static final Map<String, List<Pattern>> CONTENT_PATTERNS = Map.of(
        "price", List.of(
            Pattern.compile("Rp\\s*[\\d.,]+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\$\\s*[\\d.,]+"),
            Pattern.compile("USD\\s*[\\d.,]+", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?:price|harga|cost|biaya)\\s*:?\\s*[\\d.,]+", Pattern.CASE_INSENSITIVE)
        ),
        "duration", List.of(
            Pattern.compile("(\\d+)\\s*(?:hari|days?|nights?)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(\\d+)D(\\d+)N", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?:duration|durasi)\\s*:?\\s*(\\d+)", Pattern.CASE_INSENSITIVE)
        ),
        "phone", List.of(
            Pattern.compile("(?:\\+62|0)\\s*\\d{2,3}[-\\s]?\\d{3,4}[-\\s]?\\d{3,4}"),
            Pattern.compile("\\(?\\d{3}\\)?[-\\s]?\\d{3}[-\\s]?\\d{4}"),
            Pattern.compile("(?:phone|tel|hp|telepon)\\s*:?\\s*([\\d\\s\\-\\+\\(\\)]+)", Pattern.CASE_INSENSITIVE)
        ),
        "email", List.of(
            Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}")
        ),
        "hotel_rating", List.of(
            Pattern.compile("(\\d)\\s*(?:star|bintang|★)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("rating\\s*:?\\s*(\\d(?:\\.\\d)?)", Pattern.CASE_INSENSITIVE)
        ),
        "departure_city", List.of(
            Pattern.compile("(?:from|departure|keberangkatan|dari)\\s*:?\\s*([a-zA-Z\\s]+)", Pattern.CASE_INSENSITIVE)
        )
    );
    
    // Keywords for identifying content sections
    private static final Map<String, List<String>> SECTION_KEYWORDS = Map.of(
        "package_info", List.of("paket", "package", "detail", "info"),
        "itinerary", List.of("itinerary", "itinerari", "jadwal", "schedule", "rundown"),
        "price", List.of("harga", "price", "biaya", "cost", "rate", "tarif"),
        "accommodation", List.of("hotel", "penginapan", "accommodation", "akomodasi"),
        "services", List.of("fasilitas", "services", "included", "termasuk", "layanan"),
        "contact", List.of("contact", "kontak", "hubungi", "reach"),
        "testimonial", List.of("testimonial", "testimoni", "review", "ulasan", "feedback")
    );
    
    /**
     * Detect what type of content an element contains
     */
    public ContentType detectContentType(Element element) {
        String text = element.text().toLowerCase();
        String html = element.html().toLowerCase();
        
        // Check for specific patterns
        if (containsPattern(text, CONTENT_PATTERNS.get("price"))) {
            return ContentType.PRICE;
        }
        if (containsPattern(text, CONTENT_PATTERNS.get("duration"))) {
            return ContentType.DURATION;
        }
        if (containsPattern(text, CONTENT_PATTERNS.get("phone"))) {
            return ContentType.PHONE;
        }
        if (containsPattern(text, CONTENT_PATTERNS.get("email"))) {
            return ContentType.EMAIL;
        }
        
        // Check for section keywords
        if (containsKeywords(text, SECTION_KEYWORDS.get("itinerary"))) {
            return ContentType.ITINERARY;
        }
        if (containsKeywords(text, SECTION_KEYWORDS.get("services"))) {
            return ContentType.SERVICES;
        }
        if (containsKeywords(text, SECTION_KEYWORDS.get("testimonial"))) {
            return ContentType.TESTIMONIAL;
        }
        
        // Check HTML structure
        if (element.select("ul, ol").size() > 0) {
            return ContentType.LIST;
        }
        if (element.select("table").size() > 0) {
            return ContentType.TABLE;
        }
        
        return ContentType.UNKNOWN;
    }
    
    /**
     * Extract price from element using patterns
     */
    public Optional<BigDecimal> extractPrice(Element element) {
        String text = element.text();
        
        for (Pattern pattern : CONTENT_PATTERNS.get("price")) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String priceStr = matcher.group();
                // Clean and parse
                String cleaned = priceStr.replaceAll("[^\\d.]", "");
                try {
                    return Optional.of(new BigDecimal(cleaned));
                } catch (NumberFormatException e) {
                    log.warn("Failed to parse price: {}", priceStr);
                }
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * Extract duration in days
     */
    public Optional<Integer> extractDuration(Element element) {
        String text = element.text();
        
        for (Pattern pattern : CONTENT_PATTERNS.get("duration")) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                try {
                    return Optional.of(Integer.parseInt(matcher.group(1)));
                } catch (NumberFormatException e) {
                    log.warn("Failed to parse duration: {}", matcher.group(1));
                }
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * Extract all phone numbers from element
     */
    public List<String> extractPhoneNumbers(Element element) {
        List<String> phones = new ArrayList<>();
        String text = element.text();
        
        for (Pattern pattern : CONTENT_PATTERNS.get("phone")) {
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                phones.add(matcher.group().trim());
            }
        }
        
        return phones;
    }
    
    /**
     * Extract email addresses
     */
    public List<String> extractEmails(Element element) {
        List<String> emails = new ArrayList<>();
        String text = element.text();
        String html = element.html();
        
        // Check text content
        for (Pattern pattern : CONTENT_PATTERNS.get("email")) {
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                emails.add(matcher.group().toLowerCase());
            }
        }
        
        // Check mailto links
        element.select("a[href^='mailto:']").forEach(link -> {
            String email = link.attr("href").replace("mailto:", "").trim();
            if (!emails.contains(email)) {
                emails.add(email);
            }
        });
        
        return emails;
    }
    
    /**
     * Find elements that likely contain package information
     */
    public List<Element> findPackageElements(Document doc) {
        List<Element> candidates = new ArrayList<>();
        
        // Common package container patterns
        String[] selectors = {
            "div[class*='package']",
            "div[class*='paket']",
            "div[class*='product']",
            "div[class*='card']",
            "article[class*='package']",
            "section[class*='package']"
        };
        
        for (String selector : selectors) {
            Elements elements = doc.select(selector);
            candidates.addAll(elements);
        }
        
        // Filter by content quality (must have meaningful content)
        return candidates.stream()
            .filter(el -> el.text().length() > 100) // Minimum text length
            .filter(el -> containsPackageIndicators(el))
            .collect(Collectors.toList());
    }
    
    /**
     * Check if element contains package indicators
     */
    private boolean containsPackageIndicators(Element element) {
        String text = element.text().toLowerCase();
        
        // Must contain at least 2 of these indicators
        int indicators = 0;
        
        if (containsPattern(text, CONTENT_PATTERNS.get("price"))) indicators++;
        if (containsPattern(text, CONTENT_PATTERNS.get("duration"))) indicators++;
        if (containsKeywords(text, SECTION_KEYWORDS.get("accommodation"))) indicators++;
        if (containsKeywords(text, List.of("makkah", "mecca", "madinah", "medina"))) indicators++;
        if (containsKeywords(text, List.of("umroh", "umrah", "hajj", "haji"))) indicators++;
        
        return indicators >= 2;
    }
    
    private boolean containsPattern(String text, List<Pattern> patterns) {
        return patterns.stream().anyMatch(p -> p.matcher(text).find());
    }
    
    private boolean containsKeywords(String text, List<String> keywords) {
        return keywords.stream().anyMatch(text::contains);
    }
}

enum ContentType {
    PRICE, DURATION, PHONE, EMAIL, HOTEL_RATING,
    ITINERARY, SERVICES, TESTIMONIAL, CONTACT,
    LIST, TABLE, UNKNOWN
}
```

---

### Approach 3: Smart Scraper with Auto-Detection

Combines configuration-based and pattern-based approaches.

```java
// SmartScraper.java
@Service
public class SmartScraper {
    
    @Autowired
    private ContentDetector contentDetector;
    
    @Autowired
    private ScraperConfigRepository configRepository;
    
    @Autowired
    private EmbeddingService embeddingService;
    
    /**
     * Scrape a website intelligently
     */
    public List<PackageData> scrapeWebsite(String url) {
        // 1. Try to find existing configuration
        Optional<ScraperConfig> config = configRepository.findByUrl(url);
        
        if (config.isPresent()) {
            log.info("Using configured scraper for: {}", url);
            return scrapeWithConfig(url, config.get());
        } else {
            log.info("No config found, using intelligent detection for: {}", url);
            return scrapeWithDetection(url);
        }
    }
    
    /**
     * Scrape using pre-configured rules
     */
    private List<PackageData> scrapeWithConfig(String url, ScraperConfig config) {
        List<PackageData> packages = new ArrayList<>();
        
        try {
            Document doc = Jsoup.connect(url).get();
            
            // Find package elements using config
            Elements packageElements = doc.select(config.getPackageItemSelector());
            
            for (Element packageEl : packageElements) {
                PackageData pkg = new PackageData();
                
                // Extract each field according to config
                pkg.setName(extractField(packageEl, config.getNameSelector()));
                pkg.setPrice(extractPrice(packageEl, config.getPriceSelectors()));
                pkg.setDuration(extractDuration(packageEl, config.getDurationSelectors()));
                pkg.setDescription(extractField(packageEl, config.getDescriptionSelector()));
                pkg.setHotelName(extractField(packageEl, config.getHotelSelectors()));
                pkg.setServices(extractList(packageEl, config.getServicesSelector()));
                pkg.setItinerary(extractItinerary(packageEl, config.getItineraryConfig()));
                pkg.setContactInfo(extractContact(packageEl, config.getContactConfig()));
                pkg.setTestimonials(extractTestimonials(packageEl, config.getTestimonialConfig()));
                
                // Get detail page if available
                String detailUrl = extractDetailUrl(packageEl, config);
                if (detailUrl != null) {
                    enrichFromDetailPage(pkg, detailUrl, config);
                }
                
                packages.add(pkg);
            }
            
        } catch (IOException e) {
            log.error("Failed to scrape {}: {}", url, e.getMessage());
        }
        
        return packages;
    }
    
    /**
     * Scrape using intelligent content detection
     */
    private List<PackageData> scrapeWithDetection(String url) {
        List<PackageData> packages = new ArrayList<>();
        
        try {
            Document doc = Jsoup.connect(url).get();
            
            // Find potential package elements
            List<Element> packageElements = contentDetector.findPackageElements(doc);
            
            log.info("Found {} potential package elements", packageElements.size());
            
            for (Element packageEl : packageElements) {
                PackageData pkg = new PackageData();
                
                // Auto-detect and extract each field
                extractWithDetection(packageEl, pkg);
                
                // Validate we got minimum required data
                if (pkg.isValid()) {
                    packages.add(pkg);
                } else {
                    log.debug("Skipping invalid package: {}", pkg);
                }
            }
            
            // If no packages found with auto-detection, try alternative strategy
            if (packages.isEmpty()) {
                packages = tryAlternativeStrategy(doc);
            }
            
        } catch (IOException e) {
            log.error("Failed to scrape {}: {}", url, e.getMessage());
        }
        
        return packages;
    }
    
    /**
     * Extract data using content detection
     */
    private void extractWithDetection(Element element, PackageData pkg) {
        // Iterate through all child elements
        Elements children = element.getAllElements();
        
        for (Element child : children) {
            ContentType type = contentDetector.detectContentType(child);
            
            switch (type) {
                case PRICE:
                    if (pkg.getPrice() == null) {
                        contentDetector.extractPrice(child).ifPresent(pkg::setPrice);
                    }
                    break;
                    
                case DURATION:
                    if (pkg.getDuration() == null) {
                        contentDetector.extractDuration(child).ifPresent(pkg::setDuration);
                    }
                    break;
                    
                case PHONE:
                    List<String> phones = contentDetector.extractPhoneNumbers(child);
                    pkg.addPhones(phones);
                    break;
                    
                case EMAIL:
                    List<String> emails = contentDetector.extractEmails(child);
                    pkg.addEmails(emails);
                    break;
                    
                case SERVICES:
                    List<String> services = extractListFromElement(child);
                    pkg.setServices(services);
                    break;
                    
                case ITINERARY:
                    Map<String, String> itinerary = extractItineraryFromElement(child);
                    pkg.setItinerary(itinerary);
                    break;
                    
                case TESTIMONIAL:
                    List<Testimonial> testimonials = extractTestimonialsFromElement(child);
                    pkg.setTestimonials(testimonials);
                    break;
            }
        }
        
        // Extract name (usually in heading tags)
        if (pkg.getName() == null) {
            Elements headings = element.select("h1, h2, h3, h4");
            if (!headings.isEmpty()) {
                pkg.setName(headings.first().text());
            }
        }
        
        // Extract description (usually in paragraph tags)
        if (pkg.getDescription() == null) {
            Elements paragraphs = element.select("p");
            if (!paragraphs.isEmpty()) {
                String description = paragraphs.stream()
                    .map(Element::text)
                    .collect(Collectors.joining(" "));
                pkg.setDescription(description);
            }
        }
        
        // Extract images
        Elements images = element.select("img");
        List<String> imageUrls = images.stream()
            .map(img -> img.absUrl("src"))
            .filter(url -> !url.isEmpty())
            .collect(Collectors.toList());
        pkg.setImages(imageUrls);
    }
    
    /**
     * Try alternative scraping strategies
     */
    private List<PackageData> tryAlternativeStrategy(Document doc) {
        List<PackageData> packages = new ArrayList<>();
        
        // Strategy 1: Look for structured data (JSON-LD, microdata)
        packages.addAll(extractFromStructuredData(doc));
        
        // Strategy 2: Look for tables
        if (packages.isEmpty()) {
            packages.addAll(extractFromTables(doc));
        }
        
        // Strategy 3: Use AI to identify content
        if (packages.isEmpty()) {
            packages.addAll(extractWithAI(doc));
        }
        
        return packages;
    }
    
    /**
     * Extract from JSON-LD or other structured data
     */
    private List<PackageData> extractFromStructuredData(Document doc) {
        List<PackageData> packages = new ArrayList<>();
        
        // Look for JSON-LD
        Elements scripts = doc.select("script[type='application/ld+json']");
        for (Element script : scripts) {
            try {
                String json = script.html();
                // Parse JSON and extract package data
                PackageData pkg = parseStructuredData(json);
                if (pkg != null) {
                    packages.add(pkg);
                }
            } catch (Exception e) {
                log.debug("Failed to parse structured data: {}", e.getMessage());
            }
        }
        
        return packages;
    }
    
    /**
     * Extract from HTML tables
     */
    private List<PackageData> extractFromTables(Document doc) {
        List<PackageData> packages = new ArrayList<>();
        
        Elements tables = doc.select("table");
        for (Element table : tables) {
            // Check if table contains package data
            if (contentDetector.containsPackageIndicators(table)) {
                List<PackageData> fromTable = parsePackageTable(table);
                packages.addAll(fromTable);
            }
        }
        
        return packages;
    }
    
    private List<PackageData> parsePackageTable(Element table) {
        // Parse table rows and columns
        // This is complex and depends on table structure
        // Implementation depends on common patterns
        return new ArrayList<>();
    }
}
```

---

### Approach 4: AI-Powered Content Recognition

Use ML/NLP to identify content semantically.

```python
# ai_content_detector.py
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import Dict, List, Tuple

class AIContentDetector:
    """Use AI to detect what type of content each section contains"""
    
    def __init__(self):
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        
        # Reference embeddings for different content types
        self.content_type_examples = {
            'package_name': [
                "Paket Umroh Plus Turki 15 Hari",
                "Umrah Package Premium 12 Days",
                "Hajj Package Deluxe",
            ],
            'price': [
                "Harga: Rp 25.000.000",
                "Price: $3,500 per person",
                "Cost USD 4,200",
            ],
            'duration': [
                "14 hari 13 malam",
                "10 days 9 nights",
                "Duration: 2 weeks",
            ],
            'hotel': [
                "Hotel Bintang 5 dekat Masjidil Haram",
                "5-star hotel near Haram",
                "Accommodation: Luxury Hotel 500m from Kaaba",
            ],
            'itinerary': [
                "Hari 1: Keberangkatan dari Jakarta",
                "Day 1: Departure from airport",
                "Jadwal perjalanan lengkap",
            ],
            'services': [
                "Fasilitas termasuk: visa, tiket, hotel, makan",
                "Included services: flights, accommodation, meals",
                "Layanan: guide, transport, sim card",
            ],
            'contact': [
                "Hubungi kami: 0812-3456-7890",
                "Contact: info@umrah.com",
                "WhatsApp: +62 812 3456 7890",
            ],
            'testimonial': [
                "Alhamdulillah, pelayanan sangat memuaskan",
                "Great experience, highly recommended",
                "Review: Excellent service and guide",
            ]
        }
        
        # Pre-compute embeddings for examples
        self.reference_embeddings = {}
        for content_type, examples in self.content_type_examples.items():
            embeddings = self.model.encode(examples)
            # Average embedding for this content type
            self.reference_embeddings[content_type] = np.mean(embeddings, axis=0)
    
    def detect_content_type(self, text: str, threshold: float = 0.6) -> Tuple[str, float]:
        """
        Detect what type of content this text represents
        Returns: (content_type, confidence_score)
        """
        if not text or len(text.strip()) < 3:
            return ('unknown', 0.0)
        
        # Get embedding for input text
        text_embedding = self.model.encode(text)
        
        # Compare with all reference embeddings
        similarities = {}
        for content_type, ref_embedding in self.reference_embeddings.items():
            similarity = self._cosine_similarity(text_embedding, ref_embedding)
            similarities[content_type] = similarity
        
        # Get best match
        best_type = max(similarities, key=similarities.get)
        best_score = similarities[best_type]
        
        if best_score < threshold:
            return ('unknown', best_score)
        
        return (best_type, best_score)
    
    def _cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity"""
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
    
    def analyze_html_structure(self, html_elements: List[Dict]) -> Dict:
        """
        Analyze a list of HTML elements and categorize them
        
        Args:
            html_elements: List of dicts with 'tag', 'class', 'id', 'text'
        
        Returns:
            Categorized elements
        """
        categorized = {
            'package_name': [],
            'price': [],
            'duration': [],
            'hotel': [],
            'itinerary': [],
            'services': [],
            'contact': [],
            'testimonial': [],
            'unknown': []
        }
        
        for element in html_elements:
            text = element.get('text', '')
            content_type, confidence = self.detect_content_type(text)
            
            element['content_type'] = content_type
            element['confidence'] = confidence
            
            categorized[content_type].append(element)
        
        return categorized
    
    def extract_structured_data(self, categorized_elements: Dict) -> Dict:
        """
        Extract structured package data from categorized elements
        """
        package_data = {}
        
        # Extract name (highest confidence from package_name)
        if categorized_elements['package_name']:
            sorted_names = sorted(
                categorized_elements['package_name'],
                key=lambda x: x['confidence'],
                reverse=True
            )
            package_data['name'] = sorted_names[0]['text']
        
        # Extract price
        if categorized_elements['price']:
            price_elements = categorized_elements['price']
            # Use regex to extract actual price number
            import re
            for elem in price_elements:
                text = elem['text']
                # Try to find price pattern
                price_match = re.search(r'[\d.,]+', text.replace(',', ''))
                if price_match:
                    package_data['price'] = price_match.group()
                    break
        
        # Extract duration
        if categorized_elements['duration']:
            duration_elements = categorized_elements['duration']
            for elem in duration_elements:
                text = elem['text']
                # Extract number of days
                import re
                days_match = re.search(r'(\d+)\s*(?:hari|days?)', text, re.IGNORECASE)
                if days_match:
                    package_data['duration_days'] = int(days_match.group(1))
                    break
        
        # Extract hotel info
        if categorized_elements['hotel']:
            hotel_texts = [elem['text'] for elem in categorized_elements['hotel']]
            package_data['hotel_info'] = ' '.join(hotel_texts)
        
        # Extract services
        if categorized_elements['services']:
            services = []
            for elem in categorized_elements['services']:
                # Split by common delimiters
                text = elem['text']
                service_items = re.split(r'[,;•\n]', text)
                services.extend([s.strip() for s in service_items if s.strip()])
            package_data['services'] = services
        
        # Extract contact info
        if categorized_elements['contact']:
            contact_texts = [elem['text'] for elem in categorized_elements['contact']]
            package_data['contact_info'] = contact_texts
        
        # Extract testimonials
        if categorized_elements['testimonial']:
            testimonials = [elem['text'] for elem in categorized_elements['testimonial']]
            package_data['testimonials'] = testimonials
        
        return package_data


# Integration with Java backend
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI()
detector = AIContentDetector()

class HTMLElement(BaseModel):
    tag: str
    text: str
    class_name: str = ""
    id: str = ""

class AnalyzeRequest(BaseModel):
    elements: List[HTMLElement]

@app.post("/analyze-content")
async def analyze_content(request: AnalyzeRequest):
    """
    Endpoint for Java backend to analyze HTML elements
    """
    try:
        # Convert to dict format
        elements = [elem.dict() for elem in request.elements]
        
        # Analyze
        categorized = detector.analyze_html_structure(elements)
        
        # Extract structured data
        package_data = detector.extract_structured_data(categorized)
        
        return {
            'success': True,
            'categorized_elements': categorized,
            'extracted_data': package_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-content-type")
async def detect_content_type(text: str):
    """
    Detect content type for a single text
    """
    content_type, confidence = detector.detect_content_type(text)
    return {
        'text': text,
        'content_type': content_type,
        'confidence': confidence
    }
```

---

## 📝 Configuration Management System

### Database Schema for Scraper Configs

```sql
-- scraper_configurations table
CREATE TABLE scraper_configurations (
    id BIGSERIAL PRIMARY KEY,
    site_id VARCHAR(255) UNIQUE NOT NULL,
    site_name VARCHAR(500),
    base_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config_json JSONB NOT NULL,
    last_tested TIMESTAMP,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- scraping_logs table
CREATE TABLE scraping_logs (
    id BIGSERIAL PRIMARY KEY,
    config_id BIGINT REFERENCES scraper_configurations(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50), -- 'SUCCESS', 'PARTIAL', 'FAILED'
    packages_found INTEGER,
    packages_saved INTEGER,
    error_message TEXT,
    execution_time_ms BIGINT
);

CREATE INDEX idx_scraping_logs_config ON scraping_logs(config_id);
CREATE INDEX idx_scraping_logs_status ON scraping_logs(status);
CREATE INDEX idx_scraping_logs_date ON scraping_logs(started_at);
```

### Configuration Management Service

```java
// ScraperConfigService.java
@Service
public class ScraperConfigService {
    
    @Autowired
    private ScraperConfigRepository configRepository;
    
    /**
     * Get scraper configuration for a URL
     */
    public Optional<ScraperConfig> getConfigForUrl(String url) {
        try {
            URL urlObj = new URL(url);
            String domain = urlObj.getHost();
            
            return configRepository.findByDomain(domain)
                .filter(ScraperConfig::isActive);
                
        } catch (MalformedURLException e) {
            log.error("Invalid URL: {}", url);
            return Optional.empty();
        }
    }
    
    /**
     * Test a scraper configuration
     */
    public ScraperTestResult testConfiguration(ScraperConfig config) {
        ScraperTestResult result = new ScraperTestResult();
        result.setConfigId(config.getId());
        result.setStartTime(LocalDateTime.now());
        
        try {
            // Try to scrape using this config
            SmartScraper scraper = new SmartScraper();
            List<PackageData> packages = scraper.scrapeWithConfig(
                config.getBaseUrl(),
                config
            );
            
            result.setPackagesFound(packages.size());
            result.setSuccess(!packages.isEmpty());
            result.setSampleData(packages.stream().limit(3).collect(Collectors.toList()));
            
            // Check data quality
            result.setQualityScore(calculateQualityScore(packages));
            
        } catch (Exception e) {
            result.setSuccess(false);
            result.setErrorMessage(e.getMessage());
        }
        
        result.setEndTime(LocalDateTime.now());
        return result;
    }
    
    private double calculateQualityScore(List<PackageData> packages) {
        if (packages.isEmpty()) return 0.0;
        
        int totalFields = 0;
        int filledFields = 0;
        
        for (PackageData pkg : packages) {
            totalFields += 8; // name, price, duration, hotel, services, etc.
            
            if (pkg.getName() != null) filledFields++;
            if (pkg.getPrice() != null) filledFields++;
            if (pkg.getDuration() != null) filledFields++;
            if (pkg.getHotelName() != null) filledFields++;
            if (pkg.getDescription() != null) filledFields++;
            if (pkg.getServices() != null && !pkg.getServices().isEmpty()) filledFields++;
            if (pkg.getContactInfo() != null) filledFields++;
            if (pkg.getImages() != null && !pkg.getImages().isEmpty()) filledFields++;
        }
        
        return (double) filledFields / totalFields * 100;
    }
    
    /**
     * Create configuration by learning from successful scrape
     */
    public ScraperConfig learnConfiguration(String url, PackageData successfulExample) {
        // Reverse engineer the configuration from successful extraction
        // This is an advanced feature
        return new ScraperConfig();
    }
}
```

---

## 🎯 Recommended Implementation Strategy

### Phase 1: Start with Major Sites (Manual Config)
1. Identify top 10-20 Hajj/Umrah websites
2. Create configurations manually for each
3. Test and refine
4. Build up configuration library

### Phase 2: Add Pattern Detection
1. Implement ContentDetector
2. Use for sites without configs
3. Log successful detections
4. Generate configs automatically

### Phase 3: Add AI Detection
1. Deploy AI content detection service
2. Use as fallback for complex sites
3. Improve accuracy over time
4. Auto-generate configs from AI results

### Phase 4: Continuous Learning
1. Track scraping success rates
2. Update configs when sites change
3. A/B test different detection strategies
4. Build confidence scores

---

## ✅ Summary

### How Jsoup "Knows" What's What:

1. **Pre-configured Rules** (Best for known sites)
   - You tell it exactly where to look
   - CSS selectors, XPath, regex patterns
   - Stored in database configurations

2. **Pattern Matching** (Fallback for unknown sites)
   - Regex patterns for prices, phones, emails
   - Keyword matching for sections
   - HTML structure analysis

3. **AI Content Recognition** (Most flexible)
   - Semantic understanding using embeddings
   - Learns from examples
   - Works across different layouts

4. **Hybrid Approach** (Recommended)
   - Use config if available
   - Fall back to pattern detection
   - Use AI for ambiguous cases
   - Learn and improve over time

The key is **layered intelligence**: start with specific rules, add pattern detection, enhance with AI, and continuously learn!
