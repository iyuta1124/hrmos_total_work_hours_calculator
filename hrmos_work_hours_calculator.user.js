// ==UserScript==
// @name         HRMOS Work Hours Calculator
// @namespace    http://tampermonkey.net/
// @version      2025-04-05
// @description  HRMOSの勤怠画面で特定期間の総労働時間を計算するツール
// @author       You
// @match        https://f.ieyasu.co/works*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'
  // スタイルの追加
  const style = document.createElement('style')
  style.textContent = `
          .work-hours-calculator {
              margin: 20px 0;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 5px;
              background-color: #C7E3FF;
          }
          .work-hours-calculator h3 {
              margin: 0 0 10px 0;
              color: #333;
          }
          .work-hours-calculator .date-inputs {
              display: flex;
              gap: 10px;
              align-items: center;
              margin-bottom: 10px;
          }
          .work-hours-calculator input[type="number"] {
              padding: 5px;
              border: 1px solid #ddd;
              border-radius: 3px;
              width: 60px;
          }
          .work-hours-calculator button {
              padding: 5px 15px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 3px;
              cursor: pointer;
          }
          .work-hours-calculator button:hover {
              background: #0056b3;
          }
          .work-hours-calculator #totalResult {
              margin-top: 10px;
              font-weight: bold;
              color: #28a745;
          }
      `
  document.head.appendChild(style)

  // テーブルから日付の範囲を取得する関数
  function getDateRangeFromTable() {
    const rows = document.querySelectorAll('#editGraphTable tbody tr')
    let minDay = 31
    let maxDay = 1

    rows.forEach((row) => {
      const dateCell = row.querySelector('.cellDate')
      if (!dateCell) return

      const day = parseInt(dateCell.querySelector('.date').textContent.trim())
      if (isNaN(day)) return

      if (day < minDay) minDay = day
      if (day > maxDay) maxDay = day
    })

    return { minDay, maxDay }
  }

  // 日付範囲の総労働時間を計算する関数
  function calculateTotalWorkHours(startDay, endDay) {
    const rows = document.querySelectorAll('#editGraphTable tbody tr')
    let totalMinutes = 0
    const { minDay, maxDay } = getDateRangeFromTable()

    // 月をまたぐ場合の処理
    let isCrossMonth = false
    if (startDay > endDay) {
      isCrossMonth = true
    }

    rows.forEach((row) => {
      const dateCell = row.querySelector('.cellDate')
      if (!dateCell) return

      const day = parseInt(dateCell.querySelector('.date').textContent.trim())
      if (isNaN(day)) return

      // 日付が範囲内かチェック
      let isInRange = false
      if (isCrossMonth) {
        // 月をまたぐ場合（例：6日から5日まで）
        isInRange =
          (day >= startDay && day <= maxDay) || (day >= minDay && day <= endDay)
      } else {
        // 通常の範囲（例：1日から15日まで）
        isInRange = day >= startDay && day <= endDay
      }

      if (!isInRange) return

      const workTimeCell = row.querySelector(
        '.cellTime.cellTime07.cellBreak.view_work'
      )
      if (!workTimeCell) return

      const workTime = workTimeCell.textContent.trim()
      if (!workTime || workTime === '0:00') return

      const [hours, minutes] = workTime.split(':').map(Number)
      const totalMinutesForDay = hours * 60 + minutes

      totalMinutes += totalMinutesForDay
    })

    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    return `${totalHours}:${remainingMinutes.toString().padStart(2, '0')}`
  }

  // UIの作成と追加
  function createCalculatorUI() {
    // テーブルから日付の範囲を取得
    const { minDay, maxDay } = getDateRangeFromTable()

    // 月の最初の日と最後の日を取得
    const firstDay = minDay
    const lastDay = maxDay

    const calculator = document.createElement('div')
    calculator.className = 'work-hours-calculator'
    calculator.innerHTML = `
              <h3>日にち指定での総労働時間計算</h3>
              <div class="date-inputs">
                  <label>開始日: </label>
                  <input type="number" id="startDay" min="${minDay}" max="${maxDay}" value="${firstDay}">
                  <label>終了日: </label>
                  <input type="number" id="endDay" min="${minDay}" max="${maxDay}" value="${lastDay}">
                  <button id="calculateButton">計算</button>
              </div>
              <div id="totalResult"></div>
              <div style="font-size: 0.8em; margin-top: 5px; color: #666;">
                  ※ この月は${minDay}日から${maxDay}日までの期間です。月をまたぐ場合（例：${minDay}日から${maxDay}日まで）も計算できます。
              </div>
          `

    // ページに追加
    const targetElement = document.querySelector('#main')
    if (targetElement) {
      targetElement.parentNode.insertBefore(calculator, targetElement)
    } else {
      // 代替の配置場所を探す
      const mainContent = document.querySelector('#main')
      if (mainContent) {
        mainContent.insertBefore(calculator, mainContent.firstChild)
      }
    }

    // イベントリスナーを追加
    document
      .getElementById('calculateButton')
      .addEventListener('click', function () {
        const startDay = parseInt(document.getElementById('startDay').value)
        const endDay = parseInt(document.getElementById('endDay').value)

        // 入力値の検証
        if (
          isNaN(startDay) ||
          isNaN(endDay) ||
          startDay < minDay ||
          endDay > maxDay
        ) {
          document.getElementById('totalResult').innerHTML = `
            <span style="color: red;">エラー: 有効な日にちを入力してください (${minDay}〜${maxDay})</span>
          `
          return
        }

        const total = calculateTotalWorkHours(startDay, endDay)

        // 月をまたぐ場合の表示
        let rangeText = ''
        if (startDay > endDay) {
          rangeText = `${startDay}日から${maxDay}日まで、および${minDay}日から${endDay}日まで`
        } else {
          rangeText = `${startDay}日から${endDay}日まで`
        }

        document.getElementById('totalResult').innerHTML = `
                  ${rangeText}の総労働時間: ${total}
              `
      })
  }

  // ページ読み込み完了後に実行
  window.addEventListener('load', function () {
    // 少し遅延させて実行（DOMが完全に読み込まれるのを待つ）
    setTimeout(createCalculatorUI, 1000)
  })
})()
