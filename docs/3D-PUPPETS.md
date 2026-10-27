# 3D cut-out puppets

A cut-out puppet is an ordinary figure whose bones turn and tilt in depth, with
hand-drawn pieces joined to those bones. The puppet tools are shown in the
browser editor only (`npm run serve`, `npm run web:build`). Files that contain a
puppet open and play back the same in every build, and files without one are
untouched.

## Make a puppet

In Animate, select a plain figure and choose **Make 3D puppet** in Properties.
Every segment becomes an articulated bone at the figure's rest pose, and the
figure keeps its artwork, joint IDs, colours, pose and joins. The ordinary
articulated controls then apply (docs/RIG-CONSTRAINTS.md): **Pose** drags
joints flat on screen, holding the depth key (D) swings a part toward or away
from the camera, right-drag twists a part, **Rotate** shows the turn/tilt rings
and the Turn / tilt pad and exact angles edit the same channels. One Undo
restores the flat figure.

The conversion is available for plain figures: movieclips, drawings, figures
with connectors, Smart Stretch, weighted joints or a mesh, and figures that are
already 3D are not offered. A rigid bone ends at its straight tip, so a curved
segment keeps its curve between the bone's joints; its end joint moves to the
straight tip when the figure is converted.

## Data

`figure._styk.puppet = {version: 1}` marks the definition. Each original
segment carries `_stykRig.spatial = {parent, origin, tip, turn, pitch}` in rest
figure coordinates with `z = 0`, and two hidden static zero-length controls per
bone (`<name> turn`, `<name> tilt`) hold the turn and tilt angle channels.
`src/puppet.mjs` owns the conversion and validation; `src/editor-puppet.mjs`
exposes `makePuppet` through the ordinary topology history, so instances keep
their poses and Undo is one step. `src/puppet-view.mjs` renders the Properties
section, and `puppetToolsAvailable` gates it to the browser.

Native `.styk`/`.stkz` save the articulated bones and the marker like any other
spatial figure. Pivot `.piv`/`.stk` export rejects the rig relationships with
the existing message.

## Verification

`tests/puppet.test.mjs` checks that conversion keeps every joint at its rest and
posed position, that a tilted bone moves in depth and projects onto its origin,
that curves are kept, that Undo restores the exact flat document, that native
round trips keep the marker and geometry, and that movieclips, rigged figures
and already-3D figures are refused.
