# UI/UX Design Specification: Symptom Checker Web Application

**Project Goal:** To create the "best" user interface and experience for a symptom-checking platform, focusing on trust, clarity, and ease of use.

---

## 1. Design Philosophy: "Empathetic Clarity"
The design should not feel like a cold medical tool. Instead, it should feel like a **supportive health companion**.
*   **Trust:** Professional typography and a clean, clinical (but not sterile) layout.
*   **Calm:** Soft colors and smooth transitions to reduce user anxiety.
*   **Efficiency:** Minimal steps to reach a result, with intelligent defaults.

---

## 2. Visual Identity & Design System

### 2.1 Color Palette
| Category | Color Name | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | Healing Teal | `#007B8F` | Brand identity, primary buttons, active states. |
| **Secondary** | Serene Blue | `#E1F5FE` | Background highlights, card backgrounds. |
| **Accent** | Vitality Green | `#4CAF50` | Success states, "Low Urgency" indicators. |
| **Warning** | Caution Amber | `#FF9800` | "Medium Urgency" indicators. |
| **Alert** | Emergency Red | `#D32F2F` | "High Urgency" indicators, critical alerts. |
| **Neutral** | Soft Gray | `#F5F7FA` | App background, subtle borders. |

### 2.2 Typography
*   **Headings:** *Montserrat* (Bold/Semi-Bold) - Modern, clean, and authoritative.
*   **Body Text:** *Inter* (Regular/Medium) - Optimized for screen readability and accessibility.
*   **Scale:** 
    *   H1: 32px (Page Titles)
    *   H2: 24px (Section Headers)
    *   Body: 16px (Standard Text)
    *   Small: 14px (Captions, Disclaimers)

### 2.3 UI Components
*   **Buttons:** Rounded corners (8px radius) for a friendly feel. High-contrast primary buttons with subtle hover shadows.
*   **Input Fields:** Large, easy-to-tap areas with clear focus states and descriptive placeholders.
*   **Cards:** Minimalist white cards with soft shadows (`0px 4px 12px rgba(0,0,0,0.05)`) to create depth.

---

## 3. Core Interaction Patterns

### 3.1 The "Symptom Journey" (Step-by-Step Flow)
1.  **Welcome & Consent:** A beautiful hero section with a "Start Checking" button. Mandatory medical disclaimer modal with a clear "I Agree" action.
2.  **Visual Selection (The Body Map):**
    *   An interactive, stylized 2D human silhouette.
    *   Users click a region (e.g., Head, Chest) to filter relevant symptoms.
    *   *Interaction:* Smooth zoom-in effect on the selected region.
3.  **Smart Search & Multi-Select:**
    *   Search bar with "fuzzy matching" (e.g., typing "ack" suggests "Back pain").
    *   Selected symptoms appear as "pills" that can be easily removed.
4.  **Contextual Questions:**
    *   One question per screen to avoid overwhelming the user.
    *   Large, selectable cards for answers (e.g., "How severe is the pain?" -> [Mild] [Moderate] [Severe]).
5.  **Result Visualization:**
    *   A prioritized list of results.
    *   "Urgency Meter" showing a visual scale from "Home Care" to "Emergency".

---

## 4. Accessibility & Inclusivity (WCAG 2.1 AA)
*   **Contrast:** All text-to-background ratios will exceed 4.5:1.
*   **Screen Readers:** Semantic HTML and ARIA labels for all interactive elements.
*   **Touch Targets:** Minimum 44x44px for all clickable elements to support users with limited dexterity.
*   **Language:** Simple, non-jargon language (Grade 6 reading level).

---

## 5. Micro-interactions & Motion
*   **Progress Indicator:** A thin, animated bar at the top to show journey progress.
*   **Loading State:** A calming pulse animation (instead of a spinning wheel) while the AI analyzes symptoms.
*   **Transitions:** Gentle "fade and slide" transitions between screens to maintain context.

---

## 6. High-Fidelity Mockup Concepts
*   **Screen 1: Landing Page** - Minimalist, centered search, "Most Common Symptoms" quick-links.
*   **Screen 2: Body Map** - Light blue silhouette on a white background, interactive glowing "hotspots".
*   **Screen 3: Results Dashboard** - Large urgency indicator at the top, clear "What to do next" section.
