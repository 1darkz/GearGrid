import { type Products } from '@/composables/useFirestoreDB';
import { ref } from 'vue';

export const useCart = () => {
  const cart = ref<Products[]>([]);

  // store cart's data in localStorage to persist data after page refresh
  const storeCart = () => {
    localStorage.setItem('cart', JSON.stringify(cart.value));
  };

  // get cart's data from localStorage
  const getCart = () => {
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      cart.value = JSON.parse(cartData);
    }
  };

  // add product to cart
  const addToCart = (product: Products) => {
    cart.value.push(product);
    storeCart();
    console.log('Product added to cart', product);
  };

  // remove product from cart
  const removeFromCart = (product: Products) => {
    cart.value = cart.value.filter((item) => item.id !== product.id);
    storeCart();
  };

  // clear cart
  const clearCart = () => {
    cart.value = [];
    storeCart();
  };

  return { cart, addToCart, removeFromCart, clearCart, getCart };
};
