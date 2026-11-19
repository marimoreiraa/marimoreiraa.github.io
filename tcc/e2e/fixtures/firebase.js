// Substituto do SDK restrito aos testes: nunca acessa o Firebase de producao.
const storageKey = "e2e-tarefas";
const user = { uid: "cuidador-e2e", email: "cuidador@example.test" };
const listeners = new Set();
const readTasks = () => JSON.parse(localStorage.getItem(storageKey) || "[]");

function snapshot() {
  return {
    docs: readTasks().map(({ id, ...data }) => ({ id, data: () => data })),
    docChanges: () => [],
  };
}

export const initializeApp = () => ({});
export const getAuth = () => ({ currentUser: user });
export const getFirestore = () => ({});
export const onAuthStateChanged = (auth, callback) => {
  callback(user);
  return () => {};
};
export const collection = (db, name) => ({ name });
export const doc = (db, name, id) => ({ name, id });
export const where = (...args) => args;
export const query = (reference) => reference;
export const serverTimestamp = () => new Date().toISOString();
export const onSnapshot = (reference, callback) => {
  listeners.add(callback);
  callback(snapshot());
  return () => listeners.delete(callback);
};
export async function addDoc(reference, data) {
  if (reference.name !== "tarefas") throw new Error("Colecao inesperada no teste");
  const task = { id: crypto.randomUUID(), ...data };
  localStorage.setItem(storageKey, JSON.stringify([...readTasks(), task]));
  for (const callback of listeners) callback(snapshot());
  return { id: task.id };
}
export const getDocs = async () => snapshot();
export const updateDoc = async () => { throw new Error("updateDoc nao previsto neste teste"); };
export const deleteDoc = async () => { throw new Error("deleteDoc nao previsto neste teste"); };
export const setDoc = async () => { throw new Error("setDoc nao previsto neste teste"); };
export const signOut = async () => { throw new Error("signOut nao previsto neste teste"); };
export const getMessaging = () => { throw new Error("Push desabilitado nos testes"); };
export const getToken = async () => { throw new Error("Push desabilitado nos testes"); };
export const onMessage = () => { throw new Error("Push desabilitado nos testes"); };
