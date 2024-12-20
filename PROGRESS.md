# Progress Report for Team #9

## Progress Summary

Socket.io를 이용해 서버와 클라이언트 간의 이벤트를 통하여 HTML간의 이동과 Sqlite를 이용한 DB로 로그인과 회원가입 정보를 저장하고 채팅방을 만들어 소통할 수 있는 웹사이트를 구현하였다. 서버와 클라이언트 간의 웹소켓 통신으로 이벤트를 서로 송수신하며 여러 기능을 구현하였다. DB에 저장된 정보를 바탕으로 로그인을 처리하며, 회원가입 시 새로운 정보를 클라이언트에게서 입력받아 서버에서 DB에 저장한다. Socket.io 의 Room 기능을 이용해 특정 클라이언트들만을 채팅방에 참여시켜 동일한 채팅방에 있는 클라이언트들과 소통한다.

## Project Schedule

- ~ 12/05

  - 프로젝트의 기능적인 구현 완료.
  - 클라이언트 ID 동일화 구현.
  - CSS 구현.
  - 로컬 정적 파일 제공에서 AWS를 이용한 동적 파일 제공으로 변경.

- ~ 12/08 - 프로젝트의 문제점 및 버그 픽스 및 브랜치 합병.

- ~ 12/09 - 프레젠테이션 준비.

## Project Screenshot

## Individual Progress Status

- 최준서 :
  - 서버와 클라이언트 간 통신 구현 및 HTML 간 이동 구현
  - 클라이언트의 ID 동일화 구현
- 권혁 :
  - 로그인 기능 구현 및 데이터베이스 저장 구현
- 조영인 :
  - 암호화, 복호화 알고리즘 구현
- 장수민 :
  - 채팅방 기능 구현
  - CSS 구현
