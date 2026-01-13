# Spacing System Guide

## Standardized Spacing Scale

This document defines the consistent spacing system used throughout the application.

### Spacing Values

- `space-y-3` / `gap-3` (12px) - Tight spacing between related items
- `space-y-4` / `gap-4` (16px) - Standard spacing between form fields
- `space-y-5` / `gap-5` (20px) - Form field spacing (AuthPage forms)
- `space-y-6` / `gap-6` (24px) - Section spacing, card gaps
- `space-y-8` / `gap-8` (32px) - Large section spacing

### Component Spacing

#### Cards
- Padding: `p-6` (24px) when no header/footer
- Padding: `px-6 py-4` (24px horizontal, 16px vertical) with header/footer
- Gap between cards: `gap-6` (24px)

#### Forms
- Field spacing: `space-y-4` (16px) for LobbyPage
- Field spacing: `space-y-5` (20px) for AuthPage
- Button spacing: `gap-4` (16px) between buttons
- Button top margin: `pt-1` or `pt-2` after last field

#### Lists
- List item padding: `p-4` (16px) for room cards
- List item gap: `space-y-3` (12px) for compact lists

#### Sections
- Section gap: `space-y-6` (24px) between major sections
- Container padding: `px-4 sm:px-6 lg:px-8 py-8`

### Element Heights

#### Inputs
- Height: `h-12` (48px) - consistent across all inputs

#### Buttons
- Small: `h-8` (32px)
- Medium: `h-10` (40px)
- Large: `h-12` (48px) - matches input height

### Usage Examples

```tsx
// Form with consistent spacing
<form className="space-y-4">
  <Input label="Email" />
  <Input label="Password" />
  <div className="pt-1">
    <Button className="w-full">Submit</Button>
  </div>
</form>

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card>...</Card>
  <Card>...</Card>
</div>

// Section layout
<div className="space-y-6">
  <Section1 />
  <Section2 />
</div>
```
