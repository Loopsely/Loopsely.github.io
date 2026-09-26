# Making the background character with ChatGPT

The site already animates a character: centre in the hero → left → right → back to
centre, swinging on arrival and turning around when it changes sides. Right now it
draws a placeholder silhouette. This is how to replace it with the real avatar.

**The one rule that matters:** generate all the poses in a **single image** as a grid.
AI redraws a character from scratch on every separate generation, so twelve prompts
give you twelve slightly different people. One image = one decision about the face,
hoodie and lighting, so every pose matches.

---

## Step 1 — full body reference

Upload `assets/img/logo.jpg` to ChatGPT, then paste this:

> Using the attached image as the character reference, draw this exact same character
> as a **full-body** figure, standing, facing the viewer.
>
> Keep these identical to the reference: the face, the messy black curly hair, the
> round glasses, the short dark beard, the black hoodie, and the glowing purple flame
> emblem. Same cel-shaded anime art style, same purple rim lighting.
>
> Invent only what the reference crops out: legs, boots, and a full standing pose.
> He holds a **katana** in his right hand, pointed down and slightly out, in a relaxed
> ready stance.
>
> Full body from head to feet with nothing cropped. Flat, solid pure green background
> (#00FF00), no shadow cast on the background, no floor, no scenery, no text or
> watermark. Even lighting. Vertical image.

Regenerate until the face genuinely matches. **Everything later depends on this one
image, so do not settle.**

## Step 2 — the sequence, as one grid

The site scrubs the frames against scroll position across the whole page, mirroring
`docs/ref`: the figure starts as a huge centred close-up, the camera pulls back as you
scroll, and it settles full-body on the right. So the frames are **one slow turn with the
blade rising**, not a fast slash. Scrolling up rewinds it.

Upload the Step 1 result and paste this:

> Using the attached character, create a **sprite sheet** of a slow turn.
>
> Layout: a **4 columns × 3 rows grid**, 12 cells, read left to right, top to bottom.
> Cells are equal size with even spacing and no borders, labels or numbers.
>
> The same character appears in every cell at **exactly the same scale, same camera
> distance and same eye level**, standing on the same invisible ground line, centred in
> its cell. Identical face, hair, glasses, beard, hoodie and purple flame in all 12.
>
> Across the 12 cells he slowly rotates on the spot while raising his katana:
> 1. Facing the viewer, katana held down at his side
> 2. Turned slightly, grip tightening
> 3. Turned 45° right, katana lifting
> 4. Turned 45° right, katana at waist height
> 5. Side profile, katana at chest height
> 6. Side profile, katana at shoulder height
> 7. Turned 135°, katana rising past the shoulder
> 8. Seen from behind, katana high
> 9. Turning back, katana overhead
> 10. Turned 45° left, katana overhead, blade angled
> 11. Nearly facing the viewer, katana held high and diagonal
> 12. Facing the viewer, katana raised high in a confident finishing pose
>
> Flat, solid pure green background (#00FF00) behind everything, no shadows on the
> background, no floor, no scenery. Cel-shaded anime style, purple rim lighting.

Cell 1 is what people see at the top of the page, cell 12 is the pose he holds at the
bottom. **Cell 1 should be his calmest pose and cell 12 his strongest**, because that is
the story the scroll tells.

## Step 3 — extra angles (optional)

The site currently turns him with a horizontal flip, which is fine for a silhouette but
obvious with a detailed character. For a real turn, generate a second sheet:

> Same character and same rules as before. **4 columns × 1 row**, 4 cells: facing
> viewer, turned 45° to the right, turned 90° to the right (side profile), turned 180°
> (seen from behind). Same scale, same eye level, same ground line in all four. Flat
> pure green background (#00FF00).

Only needed if you skip the rotation in Step 2 and want the turn handled separately.

---

## Step 4 — turn the grid into frames

Save the Step 2 image anywhere, then run:

```bash
python scripts/slice-sprite.py <your-sheet.png> --cols 4 --rows 3
```

It slices the grid, removes the green background, trims every frame to the **same**
bounding box so the character does not jitter between frames, and writes
`assets/img/char/frame-00.webp` … `frame-11.webp`.

Check what it printed, then set the frame count in `assets/js/config.js`:

```js
character: {
  frames: 12,      // was 0 (placeholder)
  ...
}
```

Reload the site. The placeholder is gone and the real character rides the page.

### If the cutout looks rough

```bash
# green fringe left around the edges -> raise the tolerance
python scripts/slice-sprite.py sheet.png --cols 4 --rows 3 --tolerance 140

# parts of the character being eaten -> lower it
python scripts/slice-sprite.py sheet.png --cols 4 --rows 3 --tolerance 70

# the grid has visible gutters and the slices are off
python scripts/slice-sprite.py sheet.png --cols 4 --rows 3 --margin 12
```

If ChatGPT gives you a **transparent PNG** instead of a green background, pass
`--no-key` and it will only slice and trim.

---

## Resolution: the thing that actually decides sharpness

Cutting a sheet is lossless - it is an exact crop, nothing is resampled. The catch is
that **the sheet has a fixed maximum size**, so every pose you pack into it gets a
smaller share of those pixels.

ChatGPT outputs roughly 1024x1536. What each pose ends up with:

| Approach | Pixels per pose | Needed for full body (830 CSS px at 2x DPI) | Result |
|---|---|---|---|
| 4x3 grid, 12 poses | ~256 x 512 | 1660 | 3x upscale - soft |
| 4x1 sheet, 4 poses | ~384 x 1024 | 1660 | 1.6x upscale - mediocre |
| Separate images | ~1024 x 1536 | 1660 | ~1.1x - sharp |

So a 12-pose grid really is too small, and careful cutting cannot fix it. The trade is
**resolution against consistency**: separate generations give the most pixels but risk
the face drifting between them. Test it with three poses before committing to twelve -
see "Is separate generation good enough?" below.

## The hero close-up needs its own image

At the top of the page the figure is drawn about **1989 CSS px tall** - roughly 4000
device pixels on a high-DPI screen. Nothing generated at 1536 px will be sharp when
blown up that far.

Do not zoom a full-body frame to get the close-up. Generate a dedicated one:

> Using the attached character reference, draw the same character as a **close-up
> portrait**: head, shoulders and upper chest only, facing the viewer, looking directly
> at the camera. Same face, messy black curly hair, round glasses, short dark beard,
> black hoodie and glowing purple flame. The top of his head near the top edge, cropped
> at mid-chest. Cel-shaded anime style, purple rim lighting. Flat solid pure green
> background (#00FF00), no text. Tall portrait image.

Because it is already framed on the head, it is displayed near 1:1 instead of zoomed 2.4x.

## Is separate generation good enough?

Generate the same character three times - blade down, side profile with blade at the
shoulder, blade overhead - then:

```bash
python scripts/preview-frames.py pose1.png pose2.png pose3.png
```

It reports how far the colours drift between generations and writes `_preview-flip.gif`.
**Watch the GIF** - drift you cannot see in stills is obvious the moment frames cycle.
Under ~12% drift and a GIF that looks like one person means separate generation works,
and you should use it for the resolution.

## Getting bigger, sharper frames

He is drawn at roughly **92% of the screen height**, so on a laptop each frame is being
shown about 850 px tall. A 4×3 grid squeezes 12 poses into one image, so each cell only
gets a quarter of the sheet's width — fine, but not generous.

If the frames look soft, split the swing across **three sheets of four poses** instead of
one sheet of twelve. Each pose then gets the full width of its own image.

> Same character and same rules as before. **4 columns × 1 row**, 4 cells, same scale and
> eye level in each. Poses: [poses 1-4 from the list above]. Flat pure green background.

Then slice them in order, using `--start` so they keep numbering on from each other:

```bash
python scripts/slice-sprite.py sheet-1.png --cols 4 --rows 1 --height 1200
python scripts/slice-sprite.py sheet-2.png --cols 4 --rows 1 --height 1200 --start 4
python scripts/slice-sprite.py sheet-3.png --cols 4 --rows 1 --height 1200 --start 8
```

That gives `frame-00` … `frame-11` at 1200 px tall. `--height` controls the output size;
1200 is plenty for a full-height figure on a high-DPI screen.

**Watch the total weight.** The script prints it. Keep all the frames together under
about 3 MB, or the page gets slow on phones. Twelve frames at 1200 px usually lands
around 1–2 MB as WebP.

## "Can ChatGPT just give me 12 images in a zip?"

Not usefully, and the packaging isn't the problem — **consistency is**. ChatGPT draws one
image per request, from scratch each time. Twelve separate requests give twelve subtly
different people: the beard shifts, the hoodie changes, the glasses move. Played back at
70 ms per frame, that flickers badly.

One sheet = one drawing decision = every pose matches. The sheet *is* your twelve images;
`slice-sprite.py` is the thing that unzips it.

Splitting into three sheets of four (above) is the sensible middle ground: still only
three drawing decisions, three times the pixels per pose.

## Tips

- **Ask for the green background explicitly every time.** It is what makes the cutout
  clean and free; without it you need a background removal tool and the edges suffer.
- **Never crop or upscale the sheet by hand** before slicing. The script needs the even
  grid.
- **Fewer, better frames beat more, sloppier ones.** Anime slashes run on very few
  frames. If some cells are off-model, delete those `frame-NN` files, renumber the rest
  and lower `frames` to match.
- The resting pose must be `frame-00`, because that is what shows while standing still.
