# Map colours

Date: 5 October 2026.

The plan's five group colours (yellow, green, teal, blue, navy) were a multi-hue ramp. The groups are an
ordinal scale, so they now take one hue, light to dark: blue steps 250, 350, 450, 550 and 700 of the
reference palette in the dataviz skill. The ramp was checked with that skill's validator in ordinal mode
against the sea colour: lightness is monotone, every adjacent step differs by at least 0.06 in OKLCH
lightness, and the lightest step clears 2:1 against the sea. For that last check the sea became a
near-white (`#f8fafb`) and country borders white, so the fills carry the map. The selection outline is
orange, the hue the ramp never uses.

Library score cards use the fixed status scale (critical, serious, warning, good) rather than a continuous
gradient, and always print the score and a word beside the colour, so colour never carries the meaning alone.
The group readout already states the group in words for the same reason.
