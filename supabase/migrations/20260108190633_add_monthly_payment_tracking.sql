/*
  # Add Monthly Payment Tracking Features

  ## Purpose
  Add fields to track manual payment validation by admins and invoice delivery status.

  ## Changes to payments table
  1. Add validated_by field (references admin who validated)
  2. Add validated_at timestamp
  3. Add payment_month field for better monthly tracking

  ## Changes to invoices table  
  1. Add invoice_sent boolean to track if invoice was manually sent by admin
  2. Add sent_at timestamp
  3. Add sent_by field (admin who marked as sent)

  ## Security
  - Only admins can update validation and sent status
  - Parents can view their own payment/invoice status
*/

-- Add validation tracking to payments table
DO $$
BEGIN
  -- Add validated_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE payments ADD COLUMN validated_by uuid REFERENCES profiles(id);
  END IF;

  -- Add validated_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'validated_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN validated_at timestamptz;
  END IF;

  -- Add payment_month column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'payment_month'
  ) THEN
    ALTER TABLE payments ADD COLUMN payment_month date;
  END IF;
END $$;

-- Add invoice sending tracking to invoices table
DO $$
BEGIN
  -- Add invoice_sent column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_sent'
  ) THEN
    ALTER TABLE invoices ADD COLUMN invoice_sent boolean DEFAULT false;
  END IF;

  -- Add sent_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN sent_at timestamptz;
  END IF;

  -- Add sent_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_by'
  ) THEN
    ALTER TABLE invoices ADD COLUMN sent_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create index for faster monthly queries
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(payment_month);
CREATE INDEX IF NOT EXISTS idx_payments_parent_status ON payments(parent_id, status);
