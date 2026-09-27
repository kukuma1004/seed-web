# SEED cute seed icon · 2026-09-27

Created with the built-in ImageGen tool. Reference: public/assets/cute/seed-body-v1.webp (character identity only).

## Final generation prompt
Create ONE finished square mobile game app icon for SEED, using the attached 4-view character sprite sheet ONLY as character identity and painted style reference. Do not reproduce the sheet. Hero: the exact adorable little forest seed spirit, ivory teardrop face, two large warm amber/brown eyes, green layered leaf hood and two sprout leaves growing above its head, tiny warm golden seed chest. Single front-facing head-and-upper-chest portrait, friendly and brave, premium hand-painted 2D/2.5D game illustration with crisp silhouettes and subtly shaded natural leaves, not photorealistic, not plastic 3D. Head is large and eyes very clear at 48px. Dark deep teal forest-green background with a restrained warm golden halo behind the head, very simple and quiet with no scene, no little objects. Entire sprout, head and small chest stay inside centered circular safe region diameter 72% of canvas, important eyes inside central 50%. Background fills ALL edges fully opaque. This is the actual icon artwork, no device mockup, no grid, no rounded corner frame, no border, NO lettering or typography, no watermark. Preserve the reference character's silhouette and ivory face, don't replace it with an animal or a generic human. 1024x1024 square.

## Adaptive foreground edit prompt
Extract the exact seed character from this app icon onto genuine transparent background for Android adaptive icon foreground. Preserve the illustration exactly: leaf sprout, ivory face and amber eyes, leaf hood and golden seed chest, proportions, front pose, painterly texture. Keep the complete character uncut, perfectly centered, no additional objects/text. Remove the entire dark green background and broad gold halo; retain just a very subtle thin warm edge light on the character. Important: identical character, not redrawn style, no scene, no ground shadow. Square transparent PNG with all character features within central 86% of canvas.

## Exports
- master.png: 1024px opaque illustration source, excluded from web public directory.
- foreground.png: transparent adaptive foreground source.
- ../play-icon-512.png: 512px opaque store listing icon.
- public/icons/seed-cute-v1-*: versioned browser, PWA and Apple touch icons.
- Android mipmap resources: five densities; transparent subject fits within 55% of adaptive layer dimensions.
- tools/package-app-icon.mjs: deterministic resize/format packaging with Sharp; no art generation at runtime.

Local asset integration only. The previously submitted 1.0.54 AAB retains its original icon. Bump Android version code for the next release and upload the new store icon separately when publishing that release.
