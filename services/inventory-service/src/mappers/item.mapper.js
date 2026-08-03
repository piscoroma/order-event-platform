function toItemDto(item) {
   return {
      id: item._id,
      name: item.name,
      stock: item.stock,
      price: item.price
   };
}

module.exports = {
   toItemDto
};