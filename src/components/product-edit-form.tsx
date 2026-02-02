'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ProductEditFormProps {
  product: Product;
  onSave: (updatedProduct: Product) => void;
}

export function ProductEditForm({ product, onSave }: ProductEditFormProps) {
  const [formData, setFormData] = useState(product);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    setFormData(product);
  }, [product]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Handle price as number
    if (name === 'price') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value as any }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    
    setIsSubmitting(true);
    
    const productRef = doc(firestore, 'products', product.id);

    // Only include fields that can be edited by the owner.
    const { name, description, price, category, shippingMethod } = formData;
    const dataToUpdate = { name, description, price, category, shippingMethod };

    updateDoc(productRef, dataToUpdate)
      .then(() => {
        // The parent component will receive the updated data via the `useDoc` hook.
        // We call onSave to close the dialog.
        onSave(formData);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: productRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <form className="grid gap-6 py-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="name">Item Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={5}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleInputChange}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" value={formData.currency} disabled />
        </div>
      </div>
       <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange('category', value)}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Home Goods">Home Goods</SelectItem>
                    <SelectItem value="Sports & Outdoors">Sports & Outdoors</SelectItem>
                    <SelectItem value="Fashion">Fashion</SelectItem>
                    <SelectItem value="Musical Instruments">Musical Instruments</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="grid gap-2">
            <Label>Shipping Method</Label>
            <RadioGroup
                value={formData.shippingMethod || 'Buyer Pays'}
                onValueChange={(value) => handleSelectChange('shippingMethod', value as 'Seller Pays' | 'Buyer Pays')}
                className="flex gap-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Seller Pays" id="seller-pays-edit" />
                    <Label htmlFor="seller-pays-edit" className="font-normal">Seller Pays</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Buyer Pays" id="buyer-pays-edit" />
                    <Label htmlFor="buyer-pays-edit" className="font-normal">Buyer Pays</Label>
                </div>
            </RadioGroup>
        </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
