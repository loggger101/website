/* tests/blackjack.test.js — smoke tests for the Python→JS port in
   blackjack.js. Covers the card model that drives every round: deck
   composition, shuffle invariants, and the hand-value calculator
   (especially Aces switching from 11 to 1 to avoid a bust).

   Run with: `node --test tests/`
   No npm install needed — this uses Node's built-in test runner. */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { makeDeck, shuffle, handTotal, fmtHand } = require("../blackjack.js");

// ---------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------
function card(rank, value, suit) {
  return { rank, value, name: rank + " of " + (suit || "Spades") };
}

// ---------------------------------------------------------------
// Deck composition
// ---------------------------------------------------------------
test("makeDeck: returns a 52-card shoe", () => {
  const deck = makeDeck();
  assert.equal(deck.length, 52);
});

test("makeDeck: every card name is unique", () => {
  const deck = makeDeck();
  const names = new Set(deck.map(c => c.name));
  assert.equal(names.size, 52);
});

test("makeDeck: 4 of each rank, 13 of each suit", () => {
  const deck = makeDeck();
  const byRank = {};
  const bySuit = {};
  for (const c of deck) {
    byRank[c.rank] = (byRank[c.rank] || 0) + 1;
    const suit = c.name.split(" of ")[1];
    bySuit[suit] = (bySuit[suit] || 0) + 1;
  }
  for (const r of ["2","3","4","5","6","7","8","9","10","Jack","Queen","King","Ace"]) {
    assert.equal(byRank[r], 4, `rank ${r} should appear 4 times`);
  }
  for (const s of ["Spades","Clubs","Hearts","Diamonds"]) {
    assert.equal(bySuit[s], 13, `suit ${s} should appear 13 times`);
  }
});

test("makeDeck: face cards are worth 10, Ace defaults to 11", () => {
  const deck = makeDeck();
  for (const c of deck) {
    if (["Jack","Queen","King"].includes(c.rank)) assert.equal(c.value, 10);
    if (c.rank === "Ace") assert.equal(c.value, 11);
  }
});

// ---------------------------------------------------------------
// Shuffle invariants
// ---------------------------------------------------------------
test("shuffle: preserves length and exact card set", () => {
  const deck = makeDeck();
  const shuffled = shuffle(deck);
  assert.equal(shuffled.length, deck.length);

  const a = deck.map(c => c.name).sort();
  const b = shuffled.map(c => c.name).sort();
  assert.deepEqual(b, a);
});

test("shuffle: does not mutate the input deck", () => {
  const deck = makeDeck();
  const beforeFirst = deck[0].name;
  shuffle(deck);
  assert.equal(deck[0].name, beforeFirst, "input deck should be untouched");
});

// ---------------------------------------------------------------
// Hand value — the bug-prone part
// ---------------------------------------------------------------
test("handTotal: empty hand is 0", () => {
  assert.equal(handTotal([]), 0);
});

test("handTotal: simple non-Ace hand sums normally", () => {
  assert.equal(handTotal([card("5", 5), card("9", 9)]), 14);
});

test("handTotal: Ace counts as 11 when it fits", () => {
  assert.equal(handTotal([card("Ace", 11), card("5", 5)]), 16);
});

test("handTotal: natural blackjack = Ace + ten-value card = 21", () => {
  assert.equal(handTotal([card("Ace", 11), card("King", 10)]), 21);
  assert.equal(handTotal([card("Ace", 11), card("Jack", 10)]), 21);
  assert.equal(handTotal([card("Ace", 11), card("10", 10)]), 21);
});

test("handTotal: Ace drops to 1 to avoid a bust", () => {
  // 11 + 5 + 10 = 26 → Ace softens to 1 → 16
  assert.equal(handTotal([card("Ace", 11), card("5", 5), card("10", 10)]), 16);
});

test("handTotal: two Aces = 12 (one soft, one hard)", () => {
  assert.equal(handTotal([card("Ace", 11), card("Ace", 11)]), 12);
});

test("handTotal: three Aces = 13", () => {
  assert.equal(handTotal([card("Ace", 11), card("Ace", 11), card("Ace", 11)]), 13);
});

test("handTotal: only enough Aces drop to soften the hand", () => {
  // A + A + 9 = 11+11+9=31 → drop one ace → 21 (final).
  assert.equal(handTotal([card("Ace", 11), card("Ace", 11), card("9", 9)]), 21);
});

test("handTotal: unavoidable bust stays busted", () => {
  // 10 + 10 + 5 = 25, no Aces to soften.
  assert.equal(handTotal([card("10", 10), card("10", 10), card("5", 5)]), 25);
});

// ---------------------------------------------------------------
// fmtHand — used in the on-page log strings
// ---------------------------------------------------------------
test("fmtHand: formats a hand as a Python-style list literal", () => {
  const h = [card("Ace", 11, "Spades"), card("King", 10, "Hearts")];
  assert.equal(fmtHand(h), "['Ace of Spades', 'King of Hearts']");
});

test("fmtHand: empty hand renders as []", () => {
  assert.equal(fmtHand([]), "[]");
});
