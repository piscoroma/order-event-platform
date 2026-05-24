const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
   {
      token: {
         type: String, 
         required: true, 
         unique: true,
         lowercase: true,
         trim: true
      },
      userId: { 
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true
      },
      expiresAt: {
         type: Date,
         required: true,
      },
      revokedAt: {
         type: Date,
         default: null,
      },
   }, 
   { timestamps: true }
);

refreshTokenSchema.index(
   { expiresAt: 1 }, // create index on expireAt field, 1 means ascendent order
   { expireAfterSeconds: 0 } // remove document after 0 sec after expiration
) // TTL index: MongoDB rimuove automaticamente i documenti scaduti
 
refreshTokenSchema.methods.isValid = function () {
  return !this.revokedAt && this.expiresAt > new Date()
}

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
 
module.exports = RefreshToken;
