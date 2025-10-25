# Design Guidelines: WhatsApp Reminder Webapp

## Design Approach

**Selected Approach**: Design System - Material Design adapted for minimal productivity interface

**Justification**: This is a utility-focused application where efficiency, form usability, and data clarity are paramount. The interface prioritizes functionality over visual experimentation, requiring consistent form patterns, clear data presentation, and straightforward interactions.

**Key Design Principles**:
- Clarity over decoration
- Efficient data entry workflows
- Mobile-first responsive design
- Accessibility and form validation feedback
- Single-purpose, focused interface

---

## Typography

**Font Family**: 
- Primary: 'Inter' or 'Roboto' from Google Fonts (clean, highly legible)
- Fallback: system-ui, -apple-system, sans-serif

**Type Scale**:
- **Heading (Page Title)**: text-3xl (30px), font-semibold
- **Section Headings**: text-xl (20px), font-medium
- **Form Labels**: text-sm (14px), font-medium
- **Input Text**: text-base (16px), font-normal
- **Helper Text/Validation**: text-xs (12px), font-normal
- **Buttons**: text-sm (14px), font-medium, uppercase letter-spacing

**Line Heights**:
- Headings: leading-tight
- Body/Forms: leading-normal
- Helper text: leading-relaxed

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, and 16** consistently
- Micro spacing (form elements): p-2, gap-2
- Standard spacing (between form fields): mb-4, gap-4
- Section spacing: py-8, my-8
- Container padding: p-6 (mobile), p-8 (desktop)

**Grid System**:
- Single column layout (max-w-md centered on page)
- Form fields: full width within container
- Appointment list: single column cards, full width

**Breakpoints**:
- Mobile-first approach
- Container max-width: 448px (max-w-md) on all screens
- Centered with mx-auto

**Container Structure**:
```
- Page wrapper: min-h-screen with flex centering
- Main container: max-w-md, mx-auto, p-6
- Form container: w-full with appropriate spacing
```

---

## Component Library

### Core UI Elements

**Form Inputs**:
- Text inputs: rounded-lg, px-4 py-3, border with focus states
- Label positioning: above input with mb-2 spacing
- Input height: h-12 for comfortable touch targets
- Placeholder text: subtle, instructional
- Focus ring: 2px offset ring for accessibility

**Buttons**:
- Primary action (Submit): w-full, h-12, rounded-lg, font-medium
- Visual weight: solid background, no border
- Icon support: left-aligned icon with mr-2 spacing
- Disabled state: reduced opacity (0.5), cursor-not-allowed

**Date/Time Inputs**:
- Native HTML5 datetime-local input
- Same styling as text inputs for consistency
- Clear visual feedback when populated

**Phone Input**:
- Text input with prefix indicator (+39)
- Pattern validation visualization
- Error state clearly indicated

### Data Display

**Appointment Cards**:
- Rounded-lg container with subtle border
- p-4 internal padding
- mb-4 spacing between cards
- Organized information hierarchy:
  - Name: text-base, font-medium
  - Phone/Time: text-sm
  - Status indicator: text-xs badge

**Empty States**:
- Centered icon (96px size)
- Message: text-base, centered
- Subtle instructional text below

**Status Indicators**:
- Small badge/pill design (px-3 py-1, rounded-full, text-xs)
- "Reminder Sent" vs "Pending" states clearly differentiated

### Navigation

**Header** (if needed):
- Minimal top bar: h-16
- App title: text-xl, font-semibold
- Clean, uncluttered

### Form Validation

**Error States**:
- Red accent border on invalid inputs
- Error message: text-xs, positioned below input with mt-1
- Icon indicator (exclamation) for visual reinforcement

**Success States**:
- Green accent border on valid inputs
- Checkmark icon for confirmation
- Success message: text-sm, centered, py-4

### Overlays

**Loading States**:
- Inline spinner within button during submission
- Button text changes to "Sending..." or "Saving..."
- Disabled state during processing

**Notifications**:
- Toast/banner style at top of viewport
- Fixed positioning, w-full or max-w-md centered
- Auto-dismiss after 5 seconds
- Success/error variants clearly differentiated

---

## Page Structure

### Main Appointment Form View

**Layout**:
1. **Header Section** (mb-8):
   - App title/logo centered
   - Brief subtitle/description (text-sm)

2. **Form Section**:
   - Form container with space-y-4 for field spacing
   - Fields in this order:
     - Patient Name (text input)
     - WhatsApp Number (tel input with +39 prefix)
     - Date & Time (datetime-local input)
   - Submit button (mt-6)

3. **Appointments List** (mt-12):
   - Section heading: "Upcoming Appointments" or "Scheduled Reminders"
   - Stack of appointment cards (space-y-4)
   - Show max 5 upcoming appointments
   - Each card shows: name, phone (masked), datetime, reminder status

**Responsive Behavior**:
- Mobile (base): p-6, comfortable spacing
- Desktop (md+): same centered layout, no multi-column

---

## Images

No hero images for this application. This is a focused utility interface that prioritizes immediate functionality over visual storytelling. The interface should feel like a professional tool, not a marketing page.

**Icon Usage**:
- Form field icons (calendar for date, phone for number) - use Heroicons via CDN
- Status icons in appointment cards (clock, check)
- Empty state illustration (simple line icon, not photo)

---

## Accessibility

- All form inputs have associated labels (for/id relationship)
- Focus states clearly visible with ring-2 offset
- Color is never the only indicator of state
- Minimum touch target: 44px (h-12 for all interactive elements)
- Error messages associated with inputs via aria-describedby
- Semantic HTML throughout (form, button, input types)

---

## Interaction Patterns

**Form Submission Flow**:
1. User fills form → validation on blur for each field
2. Click submit → button shows loading state
3. Success → form clears + success message + appointment appears in list
4. Error → error message displayed + form retains values

**Real-time Validation**:
- Phone number: validate format on blur
- DateTime: ensure future date on change
- Required fields: show error on blur if empty

**Appointment Display**:
- Most recent at top
- Past appointments automatically hidden
- Reminder sent status updates without page reload (if implementing polling)

---

## Performance Considerations

- Minimal CSS framework usage (vanilla CSS or Tailwind CDN)
- No heavy JavaScript libraries
- Form validation without libraries (native HTML5 + minimal JS)
- Lazy load appointment list if exceeds 10 items
- Optimized font loading (font-display: swap)

---

## Mobile-First Specific Considerations

- Form inputs: text-base (16px) to prevent iOS zoom
- Adequate spacing between tap targets (minimum 8px gap)
- Sticky submit button option for long forms (consider fixed bottom)
- Native mobile keyboard types (type="tel", type="datetime-local")
- Viewport meta tag configured for no-zoom where appropriate