import type { CoreTranslations } from "./types";

export const coreFr: Pick<CoreTranslations, "account"> = {
  account: {
    title: "Paramètres du compte",
    firstName: "Prénom / Pseudo",
    lastName: "Nom de famille",
    mahjongsoulId: "ID Mahjong Soul",
    riichiCityId: "ID Riichi City",
    mahjongsoulIdDesc:
      'Votre ID Mahjong Soul se trouve dans l\'écran "Friends" du jeu.',
    riichiCityIdDesc:
      "Saisissez votre ID utilisateur Riichi City. Le nom d'utilisateur sera renseigné plus tard automatiquement lorsqu'une partie enregistrée le fournira.",
    accountIdLabel: "ID",
    usernameLabel: "Nom d'utilisateur",
    save: "Enregistrer",
    saved: "Paramètres enregistrés !",
    saveError: "Échec de l'enregistrement des paramètres.",
    notLoggedIn:
      "Vous devez être connecté pour accéder aux paramètres du compte.",
    setupPrompt:
      "Veuillez renseigner votre nom afin que les autres membres puissent vous reconnaître sur le calendrier des sessions.",
    linkedAccounts: "Comptes liés",
    linkAccount: "Lier le compte",
    notLinked: "Non lié",
    linkMahjongsoul: "Lier le compte Mahjong Soul",
    linkRiichiCity: "Lier le compte Riichi City",
    mahjongsoulIdRequired: "L'ID ami est requis",
    riichiCityIdRequired: "L'ID utilisateur est requis",
    confirmLink:
      "Cliquez sur le bouton ci-dessous pour lier définitivement ce compte. Cette action ne peut pas être annulée.",
    linked: "Compte lié avec succès !",
    discordAccount: "Discord",
    discordLinked: "Compte Discord lié avec succès !",
    discordLinkError: "Échec de la liaison du compte Discord.",
    preferences: "Préférences",
    tileStyle: "Style de tuiles",
    tileStyleDesc:
      "Choisissez le style d'affichage des tuiles de mahjong sur le site.",
    preferencesSaved: "Préférences enregistrées !",
    preferencesSaveError: "Échec de l'enregistrement des préférences.",
  },
};
