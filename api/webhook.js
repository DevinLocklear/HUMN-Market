const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { listing_id, buyer_id, seller_id, platform_fee, seller_payout } = session.metadata;

    await supabase.from('orders').insert({
      listing_id,
      buyer_id,
      seller_id,
      amount: session.amount_total / 100,
      platform_fee: parseInt(platform_fee) / 100,
      seller_payout: parseInt(seller_payout) / 100,
      status: 'pending',
      stripe_payment_intent: session.payment_intent,
    });

    // Mark listing as sold
    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing_id);
  }

  res.json({ received: true });
};
