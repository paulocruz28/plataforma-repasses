@echo off
set /p msg="Digite a descricao da versao (ex: crm-modals): "
if "%msg%"=="" set msg=savepoint
git add .
git commit -m "feat: %msg%"
set tagname=v%date:~6,4%-%date:~3,2%-%date:~0,2%-%time:~0,2%-%time:~3,2%
set tagname=%tagname: =0%
git tag -a "%tagname%-%msg%" -m "%msg%"
echo.
echo ==============================================
echo Versao salva com sucesso com a tag: %tagname%-%msg%
echo ==============================================
pause
