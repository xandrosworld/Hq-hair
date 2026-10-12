export const shippingToAllocate=order=>order.cancelledAt&&!order.shippedDate&&!order.inspection?.completedAt&&!order.receivedAt?0:Math.max(0,Number(order.shippingFee)||0);
