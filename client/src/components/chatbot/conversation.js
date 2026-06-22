// Button-driven chatbot conversation — Phase 1 (guided bot, no live chat yet).
//
// This file is pure config: a map of nodes the engine (useChatMachine.js) walks.
// Edit flows HERE; the engine and the presentational components don't need to change.
//
// Node shape:
//   id
//   message: string | (ctx) => string                 // the bot's line for this turn
//   kind: 'choices' | 'input'
//   options (choices): array | (ctx) => array of:
//       { label, value?, next?, set?, action?, cta? }
//   input (input): { field, inputType, placeholder, next, set, validate? }
//
// Transition primitives an option/input may carry:
//   next:   nodeId (string) | (ctx) => nodeId
//   set:    (draft, value, ctx) => partialDraft         // shallow-merged into draft
//   action: 'handoffOrder' | 'openContact' | 'emailUs' | 'navigate:/path' | 'restart'
//
// ctx = { draft, user }. Data comes from the single sources of truth so the bot
// stays in sync with the rest of the site.

import {
  products, subscriptionMonthly, SUBSCRIPTION_WEEKS, subscriptionWeekLabel,
} from '../../data/pricing';
import faqs from '../../data/faqs';
import business from '../../data/business';
import { todayStr, addDays, relativeDayLabel } from '../../utils/dates';

export const START = 'greeting';

// Maps the accumulated draft onto the shape the /order page already understands
// (location.state.reorder) plus a `prefill` channel for the fields reorder doesn't
// cover (date / times / contact). Items are sent by NAME — Order.js maps name -> id.
export function buildOrderNavState(draft) {
  const contact = draft.contact || null;
  const hasContact = contact && (contact.name || contact.email || contact.phone);
  return {
    reorder: {
      orderType: draft.orderType,
      subscriptionBundles: draft.subscriptionBundles,
      subscriptionWeek: draft.subscriptionWeek,
      items: (draft.items || []).map((it) => ({ name: it.name, quantity: it.quantity })),
    },
    prefill: {
      preferredDate: draft.preferredDate || '',
      preferredTimes: draft.preferredTimes || [],
      contact: hasContact ? contact : null,
    },
  };
}

export const nodes = {
  greeting: {
    id: 'greeting',
    kind: 'choices',
    message: (ctx) => (ctx.user?.firstName
      ? `Hey ${ctx.user.firstName}! I'm Woody 🪵 — what can I do for you?`
      : "Hi, I'm Woody! 🪵🔥 Your VOLW Firewood helper — what can I do for you?"),
    options: [
      { label: '🔥 Order firewood', next: 'order_type' },
      { label: '💲 See pricing', action: 'navigate:/pricing' },
      { label: '📦 Track my order', action: 'navigate:/my-orders' },
      { label: '❓ Common questions', next: 'faq_list' },
      { label: '💬 Talk to a person', next: 'talk_to_person' },
    ],
  },

  // --- Order wizard -------------------------------------------------------
  order_type: {
    id: 'order_type',
    kind: 'choices',
    message: 'Great! Would you like a one-time order or a monthly subscription?',
    options: [
      {
        label: 'One-time order',
        set: () => ({ orderType: 'onetime' }),
        next: 'product_pick',
      },
      {
        label: 'Monthly subscription',
        set: () => ({ orderType: 'subscription' }),
        next: 'sub_plan',
      },
    ],
  },

  product_pick: {
    id: 'product_pick',
    kind: 'choices',
    message: 'Which bundle would you like?',
    options: () => products.map((p) => ({
      label: `${p.name} — $${p.price}`,
      value: p.name,
      set: (draft, value) => ({ items: [{ name: value, quantity: 1 }] }),
      next: 'qty_pick',
    })),
  },

  qty_pick: {
    id: 'qty_pick',
    kind: 'choices',
    message: 'How many?',
    options: [
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
    ].map((o) => ({
      ...o,
      set: (draft, value) => ({
        items: (draft.items || []).map((it) => ({ ...it, quantity: value })),
      }),
      next: 'date_optional',
    })).concat([
      { label: "More — I'll set it on the order page", next: 'date_optional' },
    ]),
  },

  sub_plan: {
    id: 'sub_plan',
    kind: 'choices',
    message: 'How many bundles per month? (You can fine-tune the amount on the order page.)',
    options: () => [2, 3, 5, 10].map((n) => ({
      label: `${n} bundles / month — $${subscriptionMonthly(n)}/mo`,
      value: n,
      set: (draft, value) => ({ subscriptionBundles: value }),
      next: 'sub_week',
    })).concat([
      { label: "I'll choose the size on the order page", next: 'sub_week' },
    ]),
  },

  sub_week: {
    id: 'sub_week',
    kind: 'choices',
    message: 'Which week of the month works best for delivery? (We deliver within that week.)',
    options: () => SUBSCRIPTION_WEEKS.map((w) => ({
      label: w.value === 'any' ? 'Any week (most flexible)' : `${w.label} (${w.range})`,
      value: w.value,
      set: (draft, value) => ({ subscriptionWeek: value }),
      next: 'contact_or_review',
    })),
  },

  date_optional: {
    id: 'date_optional',
    kind: 'choices',
    message: "Have a day in mind? (You can always change it on the next page — that's where we confirm the open windows.)",
    options: [
      { label: 'Pick a preferred day', next: 'date_pick' },
      { label: "I'll choose on the order page", next: 'contact_or_review' },
    ],
  },

  date_pick: {
    id: 'date_pick',
    kind: 'choices',
    message: 'Which day looks good?',
    options: () => {
      const today = todayStr();
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, i);
        return {
          label: relativeDayLabel(d),
          value: d,
          set: (draft, value) => ({ preferredDate: value }),
          next: 'contact_or_review',
        };
      });
      return days.concat([{ label: "I'll choose later", next: 'contact_or_review' }]);
    },
  },

  contact_or_review: {
    id: 'contact_or_review',
    kind: 'choices',
    message: (ctx) => (ctx.user
      ? 'Last thing — how should we reach you about this order?'
      : 'Last thing — how should we reach you about this order? Just a few quick details.'),
    options: (ctx) => {
      if (!ctx.user) {
        return [
          { label: 'Enter my details', next: 'name_input' },
          { label: "I'll fill it in on the order page", next: 'review_handoff' },
        ];
      }
      const who = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.email;
      return [
        {
          label: `Use my account info (${who})`,
          set: (draft, value, c) => ({
            contact: {
              name: [c.user?.firstName, c.user?.lastName].filter(Boolean).join(' '),
              email: c.user?.email || '',
              phone: c.user?.phone || '',
            },
          }),
          next: 'review_handoff',
        },
        { label: 'Enter different info', next: 'name_input' },
      ];
    },
  },

  name_input: {
    id: 'name_input',
    kind: 'input',
    message: "What's your name?",
    input: {
      field: 'name',
      inputType: 'text',
      placeholder: 'Your name',
      set: (draft, value) => ({ contact: { ...(draft.contact || {}), name: value } }),
      validate: (v) => (v.trim() ? null : 'Please enter your name.'),
      next: 'phone_input',
    },
  },

  phone_input: {
    id: 'phone_input',
    kind: 'input',
    message: 'A phone number (optional — press send to skip)?',
    input: {
      field: 'phone',
      inputType: 'tel',
      placeholder: 'Phone (optional)',
      set: (draft, value) => ({ contact: { ...(draft.contact || {}), phone: value } }),
      next: 'email_input',
    },
  },

  email_input: {
    id: 'email_input',
    kind: 'input',
    message: 'And your email?',
    input: {
      field: 'email',
      inputType: 'email',
      placeholder: 'you@example.com',
      set: (draft, value) => ({ contact: { ...(draft.contact || {}), email: value } }),
      validate: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'Please enter a valid email.'),
      next: 'review_handoff',
    },
  },

  review_handoff: {
    id: 'review_handoff',
    kind: 'choices',
    message: (ctx) => {
      const d = ctx.draft;
      const lines = [];
      if (d.orderType === 'subscription') {
        lines.push(d.subscriptionBundles
          ? `• Subscription: ${d.subscriptionBundles} bundles / month ($${subscriptionMonthly(d.subscriptionBundles)}/mo)`
          : '• Subscription (choose size on the order page)');
        if (d.subscriptionWeek) lines.push(`• Delivery week: ${subscriptionWeekLabel(d.subscriptionWeek)}`);
      } else {
        lines.push('• One-time order — free delivery');
        (d.items || []).forEach((it) => lines.push(`• ${it.quantity}× ${it.name}`));
      }
      if (d.preferredDate) lines.push(`• Preferred day: ${relativeDayLabel(d.preferredDate)}`);
      if (d.contact?.name) lines.push(`• Contact: ${d.contact.name}`);
      return `Here's what I've got:\n${lines.join('\n')}\n\nTap below to review pricing and place your order.`;
    },
    options: [
      { label: 'Review & place order →', action: 'handoffOrder', cta: true },
      { label: 'Start over', action: 'restart' },
    ],
  },

  // --- FAQ ----------------------------------------------------------------
  faq_list: {
    id: 'faq_list',
    kind: 'choices',
    message: 'Sure — what would you like to know?',
    options: () => faqs.map((f, i) => ({
      label: f.q,
      value: i,
      set: (draft, value) => ({ faqIndex: value }),
      next: 'faq_answer',
    })).concat([{ label: '← Back to menu', next: 'greeting' }]),
  },

  faq_answer: {
    id: 'faq_answer',
    kind: 'choices',
    message: (ctx) => {
      const f = faqs[ctx.draft.faqIndex];
      if (!f) return 'Hmm, I don’t have an answer for that one.';
      // Show the card+Venmo answer once Stripe checkout is enabled (matches the homepage).
      return (ctx.cardEnabled && f.aWithCard) ? f.aWithCard : f.a;
    },
    options: [
      { label: 'Ask another question', next: 'faq_list' },
      { label: 'Talk to a person', next: 'talk_to_person' },
      { label: '← Back to menu', next: 'greeting' },
    ],
  },

  // --- Talk to a person (Phase-1 fallback; live chat plugs in here later) -
  talk_to_person: {
    id: 'talk_to_person',
    kind: 'choices',
    message: (ctx) => (ctx.chatAvailable
      ? "We're online right now — chat with us live, or leave a message."
      : "Happy to help! Leave us a message and we'll reply by email as soon as we can."),
    // The live option only appears when the owner has marked themselves available.
    options: (ctx) => [
      ...(ctx.chatAvailable
        ? [{ label: '💬 Chat with us live now', action: 'startLiveChat' }]
        : []),
      { label: 'Send us a message', action: 'openContact' },
      { label: `Email ${business.email}`, action: 'emailUs' },
      { label: '← Back to menu', next: 'greeting' },
    ],
  },
};
