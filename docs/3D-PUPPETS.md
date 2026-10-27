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

## Draw order follows depth

A puppet draws its parts back to front by the depth of their bones, and so do
the pieces joined to those bones: a far arm and the piece on it go behind the
body, a near arm comes in front. Parts and pieces at the same depth keep their
authored order, so a flat pose draws exactly as the figure did before it became
a puppet. The order is derived from the evaluated pose on every frame; the
document's layer and object order are unchanged, and ordinary figures, 3D
figures from asset packs and older files keep their painter order.

A piece follows the bone whose joint it is joined to, as a Pivot sprite does:
join the piece to the elbow to put it on the upper arm. It hangs from that
joint, turns with the bone's projected rotation when the bone swings in depth,
and scales with the bone's stretch; its own angle, length and scale stay
editable offsets, and flat posing keeps propagating to it as before. Pieces
joined to the figure origin and nested joins keep their place. Pieces keep their
drawn size when a bone points at the camera; use the view drawings for
strongly foreshortened poses.

## Perspective

**Perspective** in the puppet's Properties is optional and starts at zero, so
existing animations and freshly converted figures look exactly as before.
Raise its strength and the puppet's parts and pieces grow as they come toward
the camera and shrink as they go away: a piece scales around the joint it hangs
from by the depth of that joint, with the same projection as the figure's own
bones (docs/RIG-CONSTRAINTS.md, "Perspective and artistic proportions"). A
lower **Distance** foreshortens more; **Center on figure** keeps a planted
character from sliding. Stretching a piece by dragging still reaches the
pointer. The restriction that joined figures keep their own orthographic
projection no longer applies to a puppet's pieces; it still applies to plain
joins on other 3D figures.

## Data

`figure._styk.puppet = {version: 1}` marks the definition. Each original
segment carries `_stykRig.spatial = {parent, origin, tip, turn, pitch}` in rest
figure coordinates with `z = 0`, and two hidden static zero-length controls per
bone (`<name> turn`, `<name> tilt`) hold the turn and tilt angle channels.
Bones evaluate `depth` and `originDepth` (`src/rig-spatial.mjs`); a puppet's
segments and fills take `z = depth × 65536 + native order` and joined pieces
are regrouped by `puppetDrawOrder` in `src/puppet-geometry.mjs`, which publishes
`geometry.drawOrder` for onion skins, handle picking and materialization.
`puppetPiece` derives a joined piece's rotation and scale (stretch × depth
projection of its joint, from the puppet's `_stykSpatial.camera`) from its bone;
figure and movieclip pieces apply it in their own geometry builders and expose
it as `geometry.piece`.
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
and already-3D figures are refused. It also turns a puppet with two joined
pieces and checks that far parts and pieces draw first, near ones last, that a
flat pose keeps the native order, that incremental and fresh evaluation agree,
and that plain joins and non-puppet figures keep their authored order. With
perspective it checks the default of zero, the exact scale of far and near
pieces, that turning it off restores the flat drawing, that stretch drags reach
the pointer, and that plain joins on other 3D figures keep the restriction.
