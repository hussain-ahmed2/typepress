# E-commerce Setup Guide

## Overview

Typepress includes a complete e-commerce plugin suite. This guide covers setting up an online store.

## Required Plugins

Install these plugins for a basic store:

| Plugin | Purpose |
|---|---|
| Products | Product management with variations |
| Cart | Shopping cart functionality |
| Checkout | Checkout flow with payments |
| Orders | Order management |
| Coupons | Discount codes |
| Payment Gateways | Stripe, PayPal, Bank Transfer, COD |
| Shipping | Shipping zones and rates |
| Tax Rates | Tax calculation |
| Email Templates | Order notifications |
| PDF Invoices | Invoice generation |

## Setting Up Products

### Create a Product

```bash
curl -X POST http://localhost:8000/api/content \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "product",
    "slug": "wireless-headphones",
    "title": "Wireless Headphones",
    "status": "PUBLISHED",
    "meta": {
      "price": 79.99,
      "compare_at_price": 99.99,
      "sku": "WH-001",
      "stock_quantity": 50,
      "stock_status": "in_stock",
      "images": ["/uploads/headphones.jpg"],
      "attributes": {
        "color": "Black",
        "connectivity": "Bluetooth 5.0"
      }
    }
  }'
```

### Product Meta Fields

| Field | Type | Description |
|---|---|---|
| price | number | Product price |
| compare_at_price | number | Original price (for discounts) |
| sku | string | Stock Keeping Unit |
| stock_quantity | number | Available stock |
| stock_status | string | in_stock, out_of_stock, on_backorder |
| weight | number | Product weight |
| images | string[] | Image URLs |
| attributes | object | Custom attributes (color, size, etc.) |
| variations | array | Product variations |

## Setting Up Payment

### Stripe (Default)

Set environment variables:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### PayPal

Enable in payment gateway settings. Requires PayPal client ID and secret.

### Bank Transfer

Manual payment — order status set to "pending" until confirmed.

### Cash on Delivery

No online payment — order status set to "pending" until delivered.

## Setting Up Shipping

### Define Shipping Zones

```bash
curl -X POST http://localhost:8000/api/taxonomy \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "US Standard",
    "slug": "us-standard",
    "type": "shipping_zone"
  }'
```

### Shipping Methods

| Method | Rate | Free Threshold |
|---|---|---|
| Standard | $5.99 | $50+ |
| Express | $12.99 | $100+ |
| Overnight | $24.99 | $200+ |

## Setting Up Tax Rates

### US States

| State | Tax Rate |
|---|---|
| California | 7.25% |
| New York | 8.00% |
| Default US | 5.00% |

### International

| Country | Tax Name | Rate |
|---|---|---|
| UK | VAT | 20% |
| Germany | VAT | 19% |
| France | VAT | 20% |
| Australia | GST | 10% |

## Creating Coupons

```bash
curl -X POST http://localhost:8000/api/content \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "coupon",
    "slug": "welcome10",
    "title": "Welcome Discount",
    "meta": {
      "code": "WELCOME10",
      "discount_type": "percentage",
      "discount_value": 10,
      "minimum_order_amount": 25,
      "maximum_uses": 100,
      "expires_at": "2024-12-31"
    }
  }'
```

## Checkout Flow

1. Customer adds products to cart
2. Customer proceeds to checkout
3. Customer enters shipping information
4. Customer selects payment method
5. Payment is processed (Stripe/PayPal/Bank/COD)
6. Order is created
7. Confirmation email is sent
8. Invoice is generated

## Order Management

### View Orders

```bash
curl -b cookies.txt http://localhost:8000/api/content?type=order
```

### Update Order Status

```bash
curl -X PUT http://localhost:8000/api/content/:id \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "meta": {
      "status": "shipped",
      "tracking_number": "1Z999AA10123456784"
    }
  }'
```

## Email Notifications

Configure SMTP in settings or environment:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourstore.com
```

## PDF Invoices

Invoices are automatically generated for orders. Configure company details:

```env
COMPANY_NAME=Your Store Name
COMPANY_ADDRESS=123 Commerce St, City
COMPANY_EMAIL=billing@yourstore.com
```
