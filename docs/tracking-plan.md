# Tracking Plan (MVP) — Face Fitness Web

## Primary goal
Drive users from the website to the course checkout (hosted on external platform).

## Checkout URL
- Placeholder: https://example.com/checkout
- Real URL: TBA

## UTM convention for checkout links
Use UTMs on every CTA that links to checkout:

Base params:
- utm_source=facefitnessweb
- utm_medium=cta
- utm_campaign=course_launch
- utm_content=<placement>

Placements (utm_content):
- hero
- mid
- footer

Example:
https://example.com/checkout?utm_source=facefitnessweb&utm_medium=cta&utm_campaign=course_launch&utm_content=hero

## Future GA4 events (Week 3)
- cta_click
- outbound_checkout
- email_submit
- scroll_75
