# ANTIGRAVITY MASTER PROMPT — DYNAMIC, ADMIN-CONTROLLED HOMEPAGE HERO SLIDER (ISKCON JUHU SELF-EXCELLENCE)

## 0. Ground Rules
- Additive and reversible.
- Never break the public homepage (fallback to built-in default slide).
- Admin controls all aspects of the hero slides (mantra, heading, description, features, buttons, image, script overlay, vertical words, style).
- Server-side validation and sanitisation for all fields.

## 1. Data Model
- `HeroSettings`: autoplay, interval_ms, transition, transition_ms, pause_on_hover, loop, show_arrows, show_dots, show_progress_bar, min_height_desktop.
- `HeroSlide`:
  - `internal_name`, `is_active`, `display_order`, `start_at`, `end_at`
  - Mantra: `mantra_enabled`, `mantra_lines`, `mantra_color`
  - Heading: `heading_plain`, `heading_accent`, `heading_order`
  - Description: `description`
  - Features: list of up to 4 items `{ icon, label, value, custom_icon_url }`, `features_enabled`
  - Buttons: list of up to 2 items `{ enabled, label, url, style, show_arrow, open_in_new_tab }`
  - Image: `image_url`, `image_alt`, `image_mobile_url`, `image_focal_x`, `image_focal_y`, `image_fade_enabled`, `image_fade_width`, `image_zoom_effect`
  - Script Overlay: `overlay_enabled`, `overlay_text`, `overlay_x`, `overlay_y`, `overlay_size`, `overlay_rotation`, `overlay_color`
  - Vertical Words: `vertical_words_enabled`, `vertical_words`
  - Style: `background_preset`, `accent_color_preset`, `text_align_mobile`

## 2. API Endpoints
- `GET /api/hero` (public): active & scheduled slides + slider settings.
- `GET /api/hero?previewSlide=:id` (admin preview of inactive slide).
- `GET /api/admin/hero-slides` (guarded list).
- `POST /api/admin/hero-slides` (guarded create).
- `GET /api/admin/hero-slides/:id` (guarded get).
- `PUT /api/admin/hero-slides/:id` (guarded update).
- `DELETE /api/admin/hero-slides/:id` (guarded delete).
- `POST /api/admin/hero-slides/reorder` (guarded reorder).
- `POST /api/admin/hero-slides/:id/duplicate` (guarded duplicate).
- `POST /api/admin/hero-slides/:id/toggle` (guarded toggle active).
- `POST /api/admin/hero-slides/upload-image` (guarded image upload).
- `GET /api/admin/hero-settings` & `PUT /api/admin/hero-settings` (slider settings).
- `POST /api/admin/hero-slides/restore-default` (restore seeded slide).

## 3. Front-End Architecture
- `HeroSlider`: carousel container with autoplay, fade/slide transitions, swipe, keyboard controls.
- `HeroSlide`: standalone presentation of a single slide used on public homepage and admin live preview.
- Sub-components: `HeroMantra`, `HeroHeading`, `HeroFeatures`, `HeroButtons`, `HeroImage`, `HeroScriptOverlay`, `HeroVerticalWords`.
- Admin Manager: List view with cards/drag-reorder + Two-pane Editor (left form accordions, right live preview with Desktop/Tablet/Mobile device switcher).
