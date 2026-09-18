import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi').max(100),
  password: z.string().min(1, 'Password wajib diisi').max(200),
});

export const productSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  description: z.string().max(5000).optional().or(z.literal('')),

  spec_cpu: z.string().max(200).optional().or(z.literal('')),
  spec_gpu: z.string().max(200).optional().or(z.literal('')),
  spec_motherboard: z.string().max(200).optional().or(z.literal('')),
  spec_ram: z.string().max(200).optional().or(z.literal('')),
  spec_storage: z.string().max(200).optional().or(z.literal('')),
  spec_psu: z.string().max(200).optional().or(z.literal('')),
  spec_case: z.string().max(200).optional().or(z.literal('')),
  spec_other: z.string().max(2000).optional().or(z.literal('')),

  price_sold: z.coerce.number().int().min(0, 'Harga tidak boleh negatif'),
  status: z.enum(['sold', 'available']).default('sold'),
  sold_at: z.string().optional().or(z.literal('')),
  buyer_note: z.string().max(300).optional().or(z.literal('')),
});

export const productUpdateSchema = productSchema.partial();

// Validasi tipe & ukuran file gambar yang diupload
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file
export const MAX_FILES_PER_UPLOAD = 15;
