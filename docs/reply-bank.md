# Mizan — reply bank (answer-with-link)

Five replies for the questions that come up every week in r/dubai, r/UAE, r/DubaiPetrolHeads and the
big Facebook groups (Dubai Expats, British Mums Dubai, Desi in Dubai, community groups). Each one
**answers the question with a real number first**, then gives Mizan as the source. Numbers below are
the live advertised ranges in the tool (Aug 2026) — if you change the data, re-check them here.

**Rules that keep this working (and keep you un-banned)**
- Reply to a *real* question. Never open a thread just to post the link.
- Reddit: always disclose ("full disclosure, I built this"). Reddit forgives useful tools, not stealth ads.
- One reply per thread. Don't reply to every price thread the same day — 2–3 a week is plenty.
- Deep-link to the exact answer, not the homepage. Formats:
  - services: `https://www.mizan-price.com/?service=<id>&area=<Area>`  (ids: `ac`, `handyman`, `plumber`, `pest`, `haircut`, `movers`, `maid` …)
  - services guide: `https://www.mizan-price.com/prices/<slug>` (e.g. `/prices/ac-cleaning`)
  - rent: `https://www.mizan-price.com/rent?type=1br&area=Dubai%20Marina` · guide `/rent/dubai-marina` · calculator `/rent/increase-calculator`
  - motor: `https://www.mizan-price.com/motor?job=oilchange&make=Toyota` · guide `/motor/oil-change`
- Arabic threads / groups: swap in `/ar/...` — same paths.
- **Tag every link with a UTM so Vercel Analytics → UTM tab shows which channel works.** Append
  `?utm_source=<reddit|facebook|whatsapp>&utm_medium=reply&utm_campaign=<ac|rera|rent|motor|handyman>`
  (use `&` instead of `?` if the URL already has a `?`). Examples:
  - `https://www.mizan-price.com/rent/increase-calculator?utm_source=reddit&utm_medium=reply&utm_campaign=rera`
  - `https://www.mizan-price.com/?service=ac&area=Al%20Qusais&utm_source=facebook&utm_medium=reply&utm_campaign=ac`
  - `https://www.mizan-price.com/rent/dubai-marina?utm_source=whatsapp&utm_medium=reply&utm_campaign=rent`
  Baseline before any posting (Jul 17–Aug 16): 70 visitors / 144 views, ~1–3 a day, all organic.

How to find the threads: search Reddit for `"AC cleaning" price site:reddit.com/r/dubai`, `"rent increase" legal r/dubai`,
`"oil change" dealer r/DubaiPetrolHeads`; on Facebook, group search "how much" / "quote" / "is this fair".

---

## 1 · "How much should AC cleaning / servicing cost?"  (r/dubai, r/UAE, every community group — weekly)

**Reddit**
> Depends on what they're doing, but for a standard split-unit clean/service most companies in Dubai
> advertise about **AED 150–350 per unit**, and people usually end up paying below the top of that —
> around 250 is typical. Anything over ~350 a unit for a normal service (not a duct clean or a gas
> top-up) is worth a second quote.
>
> If it helps, I built a free tool that shows the advertised range next to what residents report
> actually paying, by area: https://www.mizan-price.com/?service=ac&area=Al%20Qusais — full
> disclosure it's mine, no ads or company listings, it just gets sharper the more people add what they
> paid. Type your quote in and it tells you if it's fair.

**Facebook / WhatsApp (shorter, no disclosure needed but keep it human)**
> Standard split-unit clean is usually AED 150–350 a unit in Dubai, ~250 is normal. You can check
> your exact quote here (free, shows advertised vs what people actually paid):
> mizan-price.com/?service=ac

---

## 2 · "My landlord wants to raise the rent X% — is that even legal?"  (r/dubai, r/UAE, FB expat groups — spikes Aug–Sep and Dec–Jan)

**Reddit**
> In Dubai it's capped by Decree 43/2013 and it depends on how far your *current* rent is below the
> RERA market average for similar units — not on what the landlord feels like:
> - up to 10% below market → **0% increase allowed**
> - 11–20% below → max 5%
> - 21–30% below → max 10%
> - 31–40% below → max 15%
> - more than 40% below → max 20%
>
> And they need to give **90 days' written notice** before the renewal date. So if you're paying
> roughly market rate already, the legal increase is zero, full stop.
>
> Quick way to check: I built a free calculator that does the slab maths and prefills the market average
> for your community — https://www.mizan-price.com/rent/increase-calculator (full disclosure, mine; the official
> number is the DLD rental index, which it links to). Worth running before you reply to the landlord.

**Facebook / WhatsApp**
> It's capped by RERA — if your rent is within 10% of the market average the legal increase is 0%, and
> they need 90 days' notice. Free calculator that does the slabs: mizan-price.com/rent/increase-calculator

---

## 3 · "Is AED X for a 1-bed in Marina / JVC / Business Bay reasonable?"  (r/dubai, r/DubaiRealEstate, FB housing groups — daily)

**Reddit** *(swap the community + numbers)*
> For a 1-bed in **Dubai Marina** the asking range this year is roughly **AED 88k–145k**, with most
> listings around 110k — so 120k isn't crazy but it's the upper half, and landlords list high and
> negotiate. If it's a good building/view it's fair-ish; if it's an older tower with no chiller-free,
> I'd offer 105–110.
>
> Reference numbers by community (and what tenants report actually signing, as people add theirs):
> https://www.mizan-price.com/rent/dubai-marina — I built it, it's free, no agents or listings on it,
> just the range + the legal-increase calculator for renewals.

Ready swaps (asking, per year): **JVC 1-bed 58–90k (~70k)** · **Business Bay 1-bed 88–145k (~110k)** ·
**Al Qusais 1-bed 42–66k (~52k)** · **Deira 1-bed 42–68k (~53k)** · **Marina studio 62–98k (~78k)** ·
**JVC 2-bed 85–135k (~105k)**. Guides: `/rent/jvc`, `/rent/business-bay`, `/rent/al-qusais`, `/rent/deira`.

---

## 4 · "Dealer quoted me AED X for a service / oil change — rip-off?"  (r/DubaiPetrolHeads, r/dubai, car FB groups — weekly)

**Reddit** *(swap job + make)*
> Dealers sit at the top of the range, that's normal — the question is by how much. For an **oil
> change** on a Toyota/Nissan-type car, independent garages across the UAE run about **AED 130–270**;
> for a German car (BMW/Merc/Audi) it's more like **AED 245–515** because of the oil spec and filter.
> A dealer at the top of that is expected; a dealer at *double* it is where you walk. Brake pads
> (front axle) on an economy car are ~AED 250–525, ~480–1,000 on a German one.
>
> I built a free checker that gives the typical range for the job by car make and lets you type your
> quote in: https://www.mizan-price.com/motor?job=oilchange&make=BMW — full disclosure it's mine, no
> garages pay to be on it. It also shows what other drivers report actually paying once people add theirs.

**Facebook / WhatsApp**
> Independent garages do a Toyota oil change for ~AED 130–270; German cars ~245–515. Check the exact
> job/make here (free): mizan-price.com/motor

Ready swaps (economy sedan → German): **major service 470–975 → 890–1,850** · **clutch 1,080–2,250 →
2,050–4,275** · **AC re-gas** see `/motor/ac-re-gas`. Guides: `/motor/oil-change`, `/motor/brake-pads-front`,
`/motor/clutch-replacement`, hub `/motor/jobs`.

---

## 5 · "Handyman / plumber wants AED X per hour — is that normal?"  (r/dubai, community groups — weekly)

**Reddit**
> For a general handyman, the going rate advertised in Dubai is around **AED 75–200 per hour** (110 is
> typical), usually with a 1-hour minimum. Plumber call-outs are more like **AED 100–350 per visit**
> depending on the job. If they're quoting a flat 400 for hanging a couple of shelves, that's the top of
> the range — get one more quote or ask them to bill hourly.
>
> Free reference by area, showing the advertised range next to what residents report actually paying:
> https://www.mizan-price.com/?service=handyman — full disclosure I built it; no companies on it, just
> people's prices.

**Facebook / WhatsApp**
> Handyman is usually AED 75–200/hr in Dubai (~110 normal), plumber call-out ~100–350. Check yours:
> mizan-price.com/?service=handyman

---

## Bonus · when someone asks "how do you know?" / "who's behind this?"
> It's a side project — I got tired of never knowing if a quote was fair. The advertised ranges come from
> what companies publicly list (updated monthly); the "what people paid" layer is only from residents
> adding their own price, and it only shows once there are 5+ real reports so one person can't game it.
> Free, no ads, no paid placements. If you've paid for something recently, adding it makes it better for
> the next person.

---

## Log (keep it honest — one line per post so you don't double-post)
| date | where | thread | reply # | link used |
|---|---|---|---|---|
| | | | | |
