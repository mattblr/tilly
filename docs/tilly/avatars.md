# Tilly avatars

This describes the Tilly example. Read it only when retaining or changing this
feature; it does not define requirements for a different app.

The neighbourhood-cat family is an original code drawing based on Tilly's blue,
warm white, pointed ears and cheek tufts. It is the default when someone has no
profile photo; a chosen photo is preserved. Rendering never uploads a name,
calls an image model or stores a generated image.

Web uses `TillyAvatar` and iOS uses the SwiftUI view of the same name. Both draw
the paths in `ios/Tilly/Resources/AvatarGeometry.json`. Pass a stable user ID,
not an email or display name. Identity version 1 trims ASCII space/tab/newline/
carriage return, lowercases ASCII capitals, and hashes the remaining UTF-8 bytes
with FNV-1a 32. Each trait has its own `tilly-avatar-v1|seed|trait` salt. Preserve
this version after release; a finite trait family is not collision-free.

For example, `alice` selects ears 0, head 1, marking 2 and eyes 2. The same inputs
and geometry produce the same identity in both implementations. The web
component accepts `size`, `label`, `motion` and `state="greeting"`; the native
view accepts `motion` and `greeting` inside its parent's frame. Decorative uses
are hidden from accessibility; their surrounding profile controls keep labels.

The signature gesture is a short ear flick on arrival, with sparse idle blinks
and another ear flick after a long rest. Hover/focus or a deliberate greeting
can prompt a flick too. The phase is deterministic; the identity stays the same.
Reduced motion and explicit motion off keep the useful resting pose. Web motion
pauses while hidden or outside the viewport; SwiftUI cancels its sleeping task
when the view leaves or its scene becomes inactive. Web motion uses CSS without
animation timers or pointer listeners. Both ear interiors are clipped to their
own silhouette and drawn behind the head, including the shorter ear variants.

The avatar-me skill informed the process; it is not a runtime dependency. No
third-party avatar library or brand artwork was copied into the component.
