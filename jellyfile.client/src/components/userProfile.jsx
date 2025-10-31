function UserProfile({ user }) {
  return (
      <form>
          <label>Prénom</label><input name="FirstName"></input>
          <label>Nom</label><input name="LastName"></input>
          <label>Genre</label><select name="Gender">
              <option value="">--Choisir une option--</option>  {/* option neutre */}
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
          </select>
          <label>Courriel</label><input name="Email"></input>
          <label>Téléphone</label><input name="Phone"></input>
          {user?.role === "Admin" && (
              <>
                  <label>Stockage</label>
                  <select name="StorageQuotaBytes">
                      <option value={1 * 1073741824}>1 Go</option>
                      <option value={2 * 1073741824}>2 Go</option>
                      <option value={3 * 1073741824}>3 Go</option>
                      <option value={5 * 1073741824}>5 Go</option>
                      <option value={10 * 1073741824}>10 Go</option>
                      <option value={20 * 1073741824}>20 Go</option>
                  </select>
              </>
          )}
          <br />
      </form>
  );
}

export default UserProfile;