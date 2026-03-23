'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressForm } from '@/components/address-form';
import { MapPin, PlusCircle, Edit } from 'lucide-react';
import { motion } from 'framer-motion';

function AddressFormContent() {
    const searchParams = useSearchParams();
    const { user, loading: userLoading } = useUser();

    const addressId = searchParams.get('id');
    const isEditMode = Boolean(addressId);

    return (
        <div className="p-4 md:p-5 max-w-3xl">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-5"
            >
                <div className="w-9 h-9 rounded-xl bg-purple-500/12 border border-purple-500/25 flex items-center justify-center">
                    {isEditMode
                        ? <Edit className="h-4 w-4 text-purple-400" />
                        : <PlusCircle className="h-4 w-4 text-purple-400" />
                    }
                </div>
                <div>
                    <h1 className="text-lg font-black text-white leading-none">
                        {isEditMode ? '编辑地址' : '新增地址'}
                    </h1>
                    <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest mt-0.5">
                        {isEditMode ? 'Edit Address' : 'Add New Address'}
                    </p>
                </div>
            </motion.div>

            {userLoading || !user ? (
                <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-xl bg-white/[0.03]" />
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <AddressForm userId={user.uid} addressId={addressId} />
                </motion.div>
            )}
        </div>
    );
}

export default function AddressFormPage() {
    return (
        <Suspense fallback={
            <div className="p-4 md:p-5 max-w-3xl space-y-4">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl bg-white/[0.03]" />
                ))}
            </div>
        }>
            <AddressFormContent />
        </Suspense>
    );
}
