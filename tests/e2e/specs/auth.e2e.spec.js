const { test, expect } = require("@playwright/test");

const { createAuthClient } = require("../clients/auth.client")
const { eventually } = require("../utils/eventually");

test.beforeAll(async () => {
}, 30000);

test.afterAll(async () => {
});

test.describe('Auth E2E', () => {

   test(
      "should authenticate a user with valid credentials",
      async () => {

         const authClient = createAuthClient();

         const loginResponse = await authClient.login(
            "user@example.com", 
            "user123"
         );
         expect(loginResponse.status).toBe(200);
         
         const loginData = loginResponse.body;

         expect(loginData).toHaveProperty('access_token');
         expect(typeof loginData.access_token).toBe('string');
         
         expect(loginData).toHaveProperty('refresh_token');
         expect(typeof loginData.refresh_token).toBe('string');
         
         expect(loginData).toHaveProperty('token_type');
         expect(loginData.token_type).toBe('Bearer');
         
         expect(loginData).toHaveProperty('expires_in');
         expect(typeof loginData.expires_in).toBe('string');
      }
   );

   test(
      "should reject authentication with invalid credentials",
      async () => {

         const authClient = createAuthClient();
         
         const loginResponse = await authClient.login(
            "user@example.com", 
            "wrong_password"
         );
         expect(loginResponse.status).toBe(401);

         const loginData = loginResponse.body;
         expect(loginData.error).toBe('Invalid credentials');

      }
   );

});