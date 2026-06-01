/* blackjack.js — port of blackjack.py to vanilla JS for the mini-project page.
   Preserves the original's flow exactly: same dealer-on-hit quirk, same
   snarky strings, same insurance / double-down / natural-blackjack rules,
   same bet-validation gauntlet. */

(function () {
  var container = document.getElementById("bj-game");
  if (!container) return;

  var logEl = container.querySelector(".bj-log");
  var controlsEl = container.querySelector(".bj-controls");
  var statusEl = container.querySelector(".bj-status");
  if (!logEl || !controlsEl || !statusEl) return;

  // ---------------------------------------------------------------
  // Card model
  // ---------------------------------------------------------------
  var SUITS = ["Spades", "Clubs", "Hearts", "Diamonds"];
  var RANKS = [
    ["2", 2], ["3", 3], ["4", 4], ["5", 5], ["6", 6],
    ["7", 7], ["8", 8], ["9", 9], ["10", 10],
    ["Jack", 10], ["Queen", 10], ["King", 10], ["Ace", 11]
  ];

  function makeDeck() {
    var deck = [];
    SUITS.forEach(function (suit) {
      RANKS.forEach(function (r) {
        deck.push({ name: r[0] + " of " + suit, value: r[1], rank: r[0] });
      });
    });
    return deck;
  }

  function shuffle(deck) {
    var copy = deck.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  function handTotal(hand) {
    var total = 0;
    var aces = 0;
    for (var i = 0; i < hand.length; i++) {
      total += hand[i].value;
      if (hand[i].rank === "Ace") aces += 1;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return total;
  }

  function fmtHand(hand) {
    return "[" + hand.map(function (c) { return "'" + c.name + "'"; }).join(", ") + "]";
  }

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  var state = {
    cash: 1000,
    bet: 0,
    deck: [],
    playerHand: [],
    dealerHand: [],
    insurance: 0,
    phase: "welcome"
  };

  // ---------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------
  function appendLine(text) {
    var div = document.createElement("div");
    div.className = "bj-line";
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function divider() {
    var div = document.createElement("div");
    div.className = "bj-divider";
    div.setAttribute("aria-hidden", "true");
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setStatus(text) { statusEl.textContent = text || ""; }
  function clearControls() { controlsEl.innerHTML = ""; }

  function makeButton(label, handler, opts) {
    opts = opts || {};
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm" + (opts.ghost ? " btn-ghost" : "");
    btn.textContent = label;
    btn.addEventListener("click", handler);
    controlsEl.appendChild(btn);
    return btn;
  }

  function makeYesNo(onYes, onNo) {
    clearControls();
    var yes = makeButton("Yes", onYes);
    makeButton("No", onNo, { ghost: true });
    yes.focus();
  }

  function makeBetInput(onSubmit) {
    clearControls();
    var form = document.createElement("form");
    form.className = "bj-betform";
    form.setAttribute("aria-label", "Place a bet");

    var input = document.createElement("input");
    input.type = "text"; // text, not number — the original detects non-integers
    input.inputMode = "numeric";
    input.placeholder = "Bet amount";
    input.className = "bj-input";
    input.setAttribute("aria-label", "Bet amount");
    form.appendChild(input);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn btn-sm";
    submit.textContent = "Place bet";
    form.appendChild(submit);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      onSubmit(input.value.trim());
    });

    controlsEl.appendChild(form);
    input.focus();
  }

  function refreshStatus() {
    setStatus("Balance: $" + state.cash + (state.bet ? "   •   Bet: $" + state.bet : ""));
  }

  // ---------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------
  function showWelcome() {
    state.phase = "welcome";
    logEl.innerHTML = "";
    refreshStatus();
    appendLine("Welcome to the Casino!");
    appendLine("Would you like to play a game?");
    makeYesNo(function () {
      appendLine("Good Choice");
      divider();
      startBetting();
    }, function () {
      // Matches the Python: the elif is logically always true, so the
      // game proceeds either way after this snark.
      appendLine("We Dont Need Your Permission");
      divider();
      startBetting();
    });
  }

  function startBetting() {
    if (state.cash <= 0) { showGameOver(); return; }
    state.phase = "betting";
    state.bet = 0;
    state.deck = shuffle(makeDeck());
    state.playerHand = [];
    state.dealerHand = [];
    state.insurance = 0;
    refreshStatus();

    appendLine("Our game shall begin!");
    appendLine("Your current balance is: $" + state.cash);
    appendLine("How much would you like to bet?");
    makeBetInput(function (raw) {
      // Non-integer detection mirrors `int(initial_bet)` raising.
      if (raw === "" || !/^-?\d+$/.test(raw)) {
        appendLine("We don't gamble in variables bud");
        showGameOver();
        return;
      }
      var bet = parseInt(raw, 10);
      if (bet === 0) {
        appendLine("No Spectators Allowed");
        showGameOver();
        return;
      }
      if (bet > state.cash) {
        appendLine("Real funny man aren't cha");
        showGameOver();
        return;
      }
      if (bet < 0) {
        handleNegativeBet(Math.abs(bet));
        return;
      }
      state.bet = bet;
      refreshStatus();
      dealHands();
    });
  }

  function handleNegativeBet(amount) {
    appendLine("We've got a Theif!!!");
    var outcome = Math.floor(Math.random() * 2);
    if (outcome === 0) {
      state.cash += amount;
      appendLine("You've Escaped with Your Life and " + amount + " bucks in cash.");
    } else {
      state.cash -= amount;
      appendLine("you've been shot and forced to pay a fine...");
    }
    appendLine("Your current balance is: $" + state.cash);
    refreshStatus();

    if (state.cash <= 0) {
      appendLine("You are out of money!");
      showGameOver();
      return;
    }
    appendLine("would you like to try again?");
    makeYesNo(function () {
      divider();
      startBetting();
    }, function () {
      appendLine("Then go leach off of someone else you freeloader!");
      showGameOver();
    });
  }

  function dealHands() {
    state.dealerHand = [state.deck.pop(), state.deck.pop()];
    state.playerHand = [state.deck.pop(), state.deck.pop()];
    var pNum = handTotal(state.playerHand);

    // The original prints dealer_hand[1:] (i.e. only the second card is
    // shown, the first is hidden until the round resolves).
    appendLine("Dealer's hand: " + fmtHand(state.dealerHand.slice(1)) + " And Unknown");
    appendLine("Player's hand: " + fmtHand(state.playerHand));
    appendLine("Player's total: " + pNum);

    if (state.dealerHand[1].rank === "Ace") {
      offerInsurance();
    } else {
      offerDoubleDown();
    }
  }

  function offerInsurance() {
    state.phase = "insurance";
    appendLine("Dealer has an Ace!");
    appendLine("Would you like Insurance?");
    makeYesNo(function () {
      if (state.cash >= state.bet / 2) {
        state.cash -= state.bet / 2;
        appendLine("You have paid $" + (state.bet / 2) + " for insurance.");
        state.insurance = 1;
        refreshStatus();
      } else {
        appendLine("You don't have enough money for insurance.");
      }
      offerDoubleDown();
    }, function () {
      appendLine("You have chosen not to take insurance.");
      offerDoubleDown();
    });
  }

  function offerDoubleDown() {
    // Original: only offered when no insurance AND cash >= bet*2.
    if (state.cash >= state.bet * 2 && state.insurance === 0) {
      state.phase = "doubledown";
      appendLine("Would you like to double down?");
      makeYesNo(function () {
        state.bet *= 2;
        appendLine("Your new bet is $" + state.bet);
        refreshStatus();
        askHitStand();
      }, function () {
        appendLine("Your call");
        askHitStand();
      });
    } else {
      askHitStand();
    }
  }

  function askHitStand() {
    state.phase = "playerTurn";
    appendLine("Would you like to hit or stand?");
    clearControls();
    var hit = makeButton("Hit", onHit);
    makeButton("Stand", onStand, { ghost: true });
    hit.focus();
  }

  function onHit() {
    // Player draws.
    state.playerHand.push(state.deck.pop());
    var pNum = handTotal(state.playerHand);
    appendLine("Player's hand: " + fmtHand(state.playerHand));
    appendLine("Player's total: " + pNum);

    if (pNum > 21) {
      appendLine("Bust!");
      resolveRound();
      return;
    }

    // Quirk preserved from blackjack.py: on a hit, the dealer also draws
    // (or stands) immediately rather than waiting for the player to stand.
    var dNum = handTotal(state.dealerHand);
    if (dNum < 17) {
      state.dealerHand.push(state.deck.pop());
      dNum = handTotal(state.dealerHand);
      appendLine("Dealer Hits");
      appendLine("Dealer's hand: " + fmtHand(state.dealerHand.slice(1)) + " and Unknown");
      if (dNum > 21) {
        appendLine("Dealer Busts!");
        resolveRound();
        return;
      }
    } else {
      appendLine("Dealer stands");
      appendLine("Dealer's hand: " + fmtHand(state.dealerHand.slice(1)) + " and Unknown");
    }

    askHitStand();
  }

  function onStand() {
    appendLine("Your call");
    var dNum = handTotal(state.dealerHand);
    if (dNum < 17) {
      state.dealerHand.push(state.deck.pop());
      dNum = handTotal(state.dealerHand);
      appendLine("Dealer's hand: " + fmtHand(state.dealerHand.slice(1)) + " and Unknown");
      if (dNum > 21) {
        appendLine("Dealer Busts!");
      }
    } else {
      appendLine("Dealer stands");
      appendLine("Dealer's hand: " + fmtHand(state.dealerHand.slice(1)) + " and Unknown");
      appendLine("Player's hand: " + fmtHand(state.playerHand));
      appendLine("Player's total: " + handTotal(state.playerHand));
    }
    resolveRound();
  }

  function resolveRound() {
    state.phase = "resolving";
    clearControls();
    var pNum = handTotal(state.playerHand);
    var dNum = handTotal(state.dealerHand);
    var playerBust = pNum > 21;
    var dealerBust = dNum > 21;

    divider();
    appendLine("Your cards: " + fmtHand(state.playerHand));
    appendLine("Dealer's cards: " + fmtHand(state.dealerHand));
    appendLine("Your Score: " + pNum);
    appendLine("Dealer's Score: " + dNum);

    if ((pNum > dNum && !playerBust) || (dealerBust && !playerBust)) {
      if (state.playerHand.length === 2 && pNum === 21) {
        appendLine("natural blackjack!");
        var winAmount = state.bet * 1.5;
        state.cash += winAmount;
        appendLine("You Won $" + winAmount + "!!");
      } else {
        appendLine("Player Wins!");
        state.cash += state.bet;
        appendLine("You Won $" + state.bet + "!!");
      }
    } else if ((dNum > pNum && !dealerBust) || (playerBust && !dealerBust)) {
      if (state.insurance === 1) {
        appendLine("Dealer Wins!");
        appendLine("But you have insurace so you dont have to worry about it");
      } else {
        appendLine("Dealer Wins!");
        state.cash -= state.bet;
        appendLine("You Lost $" + state.bet + ", Better Luck Next Time Bud");
      }
    } else if (pNum === dNum || (playerBust && dealerBust)) {
      appendLine("Push!");
    }

    refreshStatus();

    if (state.cash <= 0) {
      appendLine("You are out of money!");
      showGameOver();
      return;
    }

    appendLine("Your current balance is: $" + state.cash);
    appendLine("Would you like to play again?");
    makeYesNo(function () {
      appendLine("Good Choice");
      divider();
      startBetting();
    }, function () {
      appendLine("Well goodbye for now.");
      showGameOver();
    });
  }

  function showGameOver() {
    state.phase = "gameover";
    clearControls();
    var btn = makeButton("Start over", function () {
      state.cash = 1000;
      state.bet = 0;
      showWelcome();
    });
    btn.focus();
  }

  // ---------------------------------------------------------------
  // Source viewer — lazy-load blackjack.py on first <details> open.
  // ---------------------------------------------------------------
  function wireSourceViewer() {
    var details = document.getElementById("bj-source");
    if (!details) return;
    var target = details.querySelector(".bj-sourceCode");
    if (!target) return;

    var loaded = false;
    details.addEventListener("toggle", function () {
      if (!details.open || loaded) return;
      loaded = true;
      target.textContent = "Loading source…";
      fetch("blackjack.py", { cache: "no-cache" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .then(function (text) { target.textContent = text; })
        .catch(function () {
          loaded = false;
          target.textContent = "Could not load source. Use the download link instead.";
        });
    });
  }

  // Boot
  showWelcome();
  wireSourceViewer();
})();
