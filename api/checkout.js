const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { listing_id, buyer_id, seller_id, price, title, image_url } = req.body;

  if (!listing_id || !price || !title) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const platformFee = Math.round(price * 0.05 * 100); // 5% in cents
    const totalAmount = Math.round(price * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: title,
            images: image_url ? [image_url] : [],
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/orders?success=true`,
      cancel_url: `${req.headers.origin}/listing/${listing_id}`,
      metadata: {
        listing_id,
        buyer_id,
        seller_id,
        platform_fee: platformFee,
        seller_payout: totalAmount - platformFee,
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};
