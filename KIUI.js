// ==UserScript==
// @name     KIUI
// @namespace  http://tampermonkey.net/
// @version    1.0
// @description  Améliorations de l'UI de Kraland
// @author     Elena
// @match    *://www.kraland.org/*
// @match    *://kraland.org/*
// @icon     https://www.google.com/s2/favicons?sz=64&domain=kraland.org
// @grant    none
// @projectSource https://raw.githubusercontent.com/lc-thomas/KIUI/master/KIUI.js
// ==/UserScript==

/*
 * Fetch to DOM permet de récupérer le contenu d'une popup d'ordre et de l'intégrer au DOM.
 * Le contenu de la popup est encode en iso-8859-1 donc on le décode également, puis il est rendu invisible, mais permet au script d'intéragir avec les ordres.
 */
function fetchToDOM(url) {
  return fetch(url).then(response => {
    return response.arrayBuffer()
  }).then(buffer => {
    let decoder = new TextDecoder("iso-8859-1")
    let text = decoder.decode(buffer);
    return text
  }).then(text => {
    let popupContainer = document.createElement('div')
    popupContainer.id = `KIUI_hidden_popup`
    popupContainer.style = 'display:none'
    popupContainer.innerHTML = text
    document.querySelector('body').appendChild(popupContainer)
    return popupContainer
  })
}

class KIUIButton {
  /* KIUI Button
   *
   * Cette classe permet de faciliter la création de boutons pour l'interface.
   * Elle va créer le bouton, appeler la popup en ajax, la charger sur la page masquée, et envoyer le formulaire avec les valeurs définies
   * Normalement pas besoin de trop bidouiller ici, ça va se passer plus bas.
   *
   * Paramètres :
   * - appendTo     : append the button to ...
   * - cls      : classe CSS pour le bouton ("group", "character" ou "item")
   * - buttonImageURL : image du bouton
   * - popupHref    : adresse de la popup de l'ordre
   * - order Id     : identifiant de l'ordre (eg: "300010")
   * - action     : sur quelle page aller (eg: "main.php?p=2_2")
   *
   */
  orderId = ''
  constructor(prependTo, cls, buttonImageURL, popupURL, orderId, action, clickCB = function() {}) {
    let button = document.createElement('img')
    button.setAttribute('src', buttonImageURL)
    button.setAttribute('class', `KIUI_icon KIUI_${cls}_icon`)
    button.addEventListener('click', (ev) => {
      fetchToDOM(popupURL).then(popupContainer => {
        // On poste sur la page d'où on vient :
        popupContainer.querySelector(`#order${orderId}`).action = action
        // Callback pour les ordres qui recquièrent des paramètres
        clickCB(popupContainer.querySelector(`#order${orderId}`))
        // Et on envoie.
        popupContainer.querySelector(`#order${orderId}`).submit()
      })
    });
    prependTo.prepend(button)
    return button
  }
}

(function() {
  'use strict';
  console.log('KIUI - Initilisation')
  let currentPage = init()

  /*********************
   * PAGE "Se déplacer"
   *********************/
  if (currentPage == 'main.php?p=2_2') {
    // Carrière du personnage, avec une majuscule, ex: 'Assassin'
    let carrierePerso = document.querySelectorAll('#left > table')[1].querySelectorAll('td > a')[0].innerHTML
    console.log("KIUI - Amélioration de la page 'Se déplacer'")
    /*
     * ORDRES DE GROUPES - Ajout des boutons sur les groupes (se cacher, fouiller, combattre)
     */
    let groups = Array.from(document.querySelectorAll('.left-frame>table>tbody>tr>th.thb'))
    if (groups.length == 0) {
      location.replace('http://www.kraland.org/' + currentPage)
      // Bug, certainement la protection contre les actions multiples, rechargeons simplement la page
    }
    // On se débarasse des PNJ Conteurs
    while (groups[0].innerHTML.startsWith('PNJ Conteur')) {
      groups.shift()
    }
    groups.forEach(function(group, i) {
      if (i == 0) {
        // Le premier groupe est le nôtre, ajout des ordres "fouiller" et "se cacher".
        let seCacherButton = new KIUIButton(group, 'group', 'https://i.imgur.com/ckDpsSi.png', group.querySelector('a').href, '300201', currentPage)
        let fouillerButton = new KIUIButton(group, 'group', 'https://i.imgur.com/Qy44kaA.png', group.querySelector('a').href, '300203', currentPage)
      } else {
        // Ordres sur les autres groupes : "combattre"
        let combattreButton = new KIUIButton(group, 'group', 'https://i.imgur.com/HXZRcK3.png', group.querySelector('a').href, '300205', currentPage)
      }
    })
    /*
     * ORDRES SUR PERSONNAGES - Ajout des boutons sur les personnages (Signaler la présence, Capturer, Ligoter, ...)
     */
    let tbody = document.querySelector('.left-frame>table>tbody')
    let characters = tbody.querySelectorAll('tr>td.tdb, tr>td.tdb1, tr>td.tdb2, tr>td.tdb3')
    characters.forEach(function(character, i) {
      if (character.querySelector('.corner') == null) {
        // Le personnage n'a pas de drapeau, certainement un PNJ Conteur... On laisse filer
        return;
      }
      // Il nous reste les PJ et PNJs type employés
      if (character.classList.contains('tdb')) {
        // PJs seulement
        // Signalement de présence
        let presenceButton = new KIUIButton(character.querySelector('.corner'), 'character', 'https://i.imgur.com/1MdjKdC.png', character.querySelector('a').href, '300029', currentPage, function(form) {
          form.querySelector('textarea').value = "Vu !"
        })
        // Capture
        let captureButton = new KIUIButton(character.querySelector('.corner'), 'character', 'https://i.imgur.com/VpmJff4.png', character.querySelector('a').href, '300021', currentPage)
        // Assassin - Peur (PJ seulement, aucun intérêt sur les PNJ)
        if (carrierePerso == 'Assassin') {
          if (i != 0) {
            let peurButton = new KIUIButton(character.querySelector('.corner'), 'character', 'https://i.imgur.com/YpZo8D8.png', character.querySelector('a').href, '300051', currentPage, function(form) {
              form.querySelector('textarea').value = "[i][gray]* Une ombre terrifiante passe près de vous. *[/gray][/i]"
            })
          }
        }
      }
      if (character.classList.contains('tdb1') || character.classList.contains('tdb2') || character.classList.contains('tdb3')) {
        // NPC, je crois que chaque type d'employé a sa classe.
        // Les miliciens type paramilitaire ou sectateur c'est tdb1
        // Les recrues type garde du corps ou MA c'est tdb2
        // Et les employés de fonction type avion présidentiel c'est tdb3
      }
      // Ici c'est sur toutes les lignes, autant PNJ que PJ
      /* Assassin - Assassiner (PJ et PNJ) */
      if (carrierePerso == 'Assassin') {
        if (i != 0) { // Pas sur le tout premier perso (probablement nous)
          let assassinerButton = new KIUIButton(character.querySelector('.corner'), 'character', 'https://i.imgur.com/dqSN5lS.png', character.querySelector('a').href, '300072', currentPage, function(form) {
            form.querySelector('textarea').value = "[i][gray]* Une lame se plante dans votre nuque. *[/gray][/i]"
          })
        }
      }
    })
    /*
     * ORDRES SUR LES OBJETS au sol - Ajout d'un bouton pour ramasser un objet
     */
    let rightElements = document.querySelectorAll('.right-frame table > tbody > tr')
    let material = false
    rightElements.forEach((element, i) => {
      if (material == false) {
        // On cherche la cellule "Matériel"
        let th = element.querySelector('th')
        if (th == null) {
          return
        }
        if (th.innerHTML == 'MATÉRIEL') {
          material = true
        }
      } else {
        // Si la ligne ne contient pas les cellules des objets alors on est plus dans le "Matériel"
        // Attention, la "charge" n'apparait pas toujours, l'argent par exemple n'a pas de poids...
        if (element.querySelectorAll('.tdb, .tdbc').length != 2) {
          material = false
          return
        }
        // Ici on a plus que le matériel
        // Ajout d'un bouton pour ramasser l'objet
        let ramasserButton = new KIUIButton(element.querySelector('.tdb'), 'item', 'https://i.imgur.com/cef8Fq5.png', element.querySelector('a').href, '200101', currentPage, function(form) {
          // Deux possibilités, on a soit un select duquel on va prendre la dernière valeur (la plus grande)
          let select = form.querySelector('select[name="p3"]')
          if (select != null) {
            select.value = select.lastChild.value
          }
          // Soit on a un champ de texte avec un nombre à saisir
          // la valeur max est écrite, on la récupère.
          let input = form.querySelector('input[name="p3"]')
          if (input != null) {
            let maxVal = input.parentElement.innerHTML.replace(')', '').split(' ').pop()
            input.value = maxVal
          }
        })
      }
    })
  }
  // FIN DE LA PAGE "Se déplacer"

  /*********************
   * PAGE "Matériel"
   *********************/
  let containerItemsNumbers = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 100
  ]
  if (currentPage == 'main.php?p=2_1') {
    console.log("KIUI - Amélioration de l'interface de la page 'Matériel'")
    /*
     * Partie gauche de la page matériel
     */
    document.querySelectorAll('.left-frame .tdb').forEach(inventory_element => {
      inventory_element = inventory_element.parentElement // on veut la ligne
      if (inventory_element.innerHTML.indexOf('Trésor') != -1 || inventory_element.innerHTML.indexOf('Trousseau') != -1)
        // On ignore le trésor et le jeu de clés
        return
      // Bouton "déposer" pour sortir un objet de l'inventaire
      new KIUIButton(inventory_element.querySelector('.tdb'), 'item', 'https://i.imgur.com/e8M56HI.png', inventory_element.querySelector('a').href, '110001', currentPage, function(form) {
        let select = form.querySelector('select[name="p3"]')
        if (select != null) // ça pourrait être un input text si la valeur dépasse une certaine marge...
          select.value = select.lastChild.value // on dépose le plus possible
      })
      let itemLink = inventory_element.querySelector('a')
      // Bouton convertir sur l'or.
      if (itemLink.innerHTML == 'Ors' || itemLink.innerHTML == 'Or') {
        new KIUIButton(inventory_element.querySelector('.tdb'), 'item', 'https://i.imgur.com/HvbIQgC.png', inventory_element.querySelector('a').href, '110017', currentPage, function(form) {
          let select = form.querySelector('select[name="p3"]')
          select.value = select.lastChild.value // on convertit le plus d'or possible
        })
      }
      // Ajout des conteneurs à l'interface (sac à dos, valise, véhicules..)
      if (!itemLink.innerHTML.includes('Sac à Dos') && !itemLink.innerHTML.includes('Valise') && !itemLink.innerHTML.includes('Bus') && !itemLink.innerHTML.includes('Camion') // marche aussi pour la Camionnette
        && !itemLink.innerHTML.includes('Voiture') // + voiture de sport
        && !itemLink.innerHTML.includes('Moto') // + moto de course
        && !itemLink.innerHTML.includes('Voilier') && !itemLink.innerHTML.includes('Caravelle') && !itemLink.innerHTML.includes('Cargo') && !itemLink.innerHTML.includes('Montgolfière') && !itemLink.innerHTML.includes('Hélicoptère') && !itemLink.innerHTML.includes('Jet')) {
        return
      }
      let itemId = itemLink.getAttribute('href').split('=')[2]
      fetchToDOM(itemLink.href).then(popupContainer => {
        let infos = popupContainer.querySelectorAll('.op p') // 1 => contenu, 2 => charge
        let containerTable = document.createElement('table')
        containerTable.style.width = '280px'
        containerTable.style.marginBottom = '20px'
        let tr = document.createElement('tr')
        let th = document.createElement('th')
        th.setAttribute('colspan', '2')
        th.setAttribute('class', 'thb')
        th.innerHTML = itemLink.innerHTML
        tr.appendChild(th)
        containerTable.appendChild(tr)
        tr = document.createElement('tr')
        let td = document.createElement('td')
        td.style.textAlign = 'center'
        td.style.backgroundColor = '#aaa'
        td.innerHTML = infos[2].innerHTML
        tr.appendChild(td)
        containerTable.appendChild(tr)
        let items = infos[1].innerHTML.replace('Contenu : ', '').split(',')
        for (let item of items) {
          if (item == '') {
            continue
          }
          tr = document.createElement('tr')
          td = document.createElement('td')
          td.innerHTML = item
          let img = document.createElement('img')
          img.setAttribute('src', 'https://i.imgur.com/cef8Fq5.png')
          img.setAttribute('class', 'KIUI_icon KIUI_item_icon')
          let words = item.split(' ')
          let quantity = words[words.length - 1].includes('(') && words[words.length - 1].includes(')') ? parseInt(words[words.length - 1].replace(')', '').replace('(', '')) : 1
          img.addEventListener('click', event => {
            for (let option of popupContainer.querySelectorAll(`#order110005 select[name="p7"] option`)) {
              if (option.innerHTML.trim() == item.trim()) {
                popupContainer.querySelector(`#order110005 select[name="p7"]`).value = option.value
                break
              }
            }
            let move_quantity = 1
            try {
              move_quantity = img.parentElement.querySelector('select').value
            } catch (e) {}
            popupContainer.querySelector(`#order110005 select[name="p6"]`).value = move_quantity
            popupContainer.querySelector('#order110005').submit()
          })
          td.appendChild(img)
          if (quantity > 1) {
            let select = document.createElement('select')
            select.style.float = 'right'
            select.style.height = '18px'
            select.style.width = '50px'
            for (let value of containerItemsNumbers) {
              if (value <= quantity) {
                let option = document.createElement('option')
                option.value = value
                option.innerHTML = value
                select.appendChild(option)
              }
            }
            td.appendChild(select)
          }
          tr.appendChild(td)
          containerTable.appendChild(tr)
        }
        document.querySelector('.right-frame').insertAdjacentElement('afterbegin', containerTable)
      })
    })
  }
  // FIN DE LA PAGE "Matériel"
})();

function init() {
  let currentPage = locate()
  console.log("  - page actuelle :", currentPage)
  injectCSS()
  return currentPage
}

function locate() {
  if (!location.href.startsWith('http://www.kraland.org') || location.href.endsWith('kraland.org/') || location.href.endsWith('kraland.org')) {
    location.replace('http://www.kraland.org/main.php')
    return
  }
  let page = location.href.split('/').pop()
  if (page == "main.php" || page == 'main.php?p=2' || page.startsWith('main.php?p=2_2')) {
    return 'main.php?p=2_2'
  }
  if (page.startsWith('main.php?p=2_1')) {
    return 'main.php?p=2_1'
  }
  return page
}

function injectCSS() {
  console.log('  - injection des règles de style...')
  let style = document.createElement('style');
  style.innerHTML = `
  .forum .forum-message img {
    max-width: 100%;
  }

  .cpointer{
    cursor: pointer;
  }

  .KIUI_icon {
    height: 16px;
  }

  .KIUI_icon:hover{
    opacity: 0.8;
    cursor: pointer;
  }

  .KIUI_group_icon{
    float: right;
    border-left: 5px solid #444;
  }

  .KIUI_character_icon{
    float : left;
    margin-right: 2px;
    border: 1px solid black;
  }

  .KIUI_item_icon{
    float: right;
    margin-right: 3px;
    margin-left: 3px;
    border: 1px solid black;
  }
  `;
  document.head.appendChild(style)
}